import * as path from 'path';
import { Parser, ParsedVariable, ParserOptions, DEFAULT_PARSER_OPTIONS } from './types';

/**
 * Abstract base class for all parsers
 * Provides common functionality and enforces the Parser interface
 */
export abstract class BaseParser implements Parser {
  abstract readonly name: string;
  abstract readonly supportedExtensions: string[];

  protected options: ParserOptions;

  /** Newline offsets cached per content so getLineNumber stays O(log n) per call. */
  private lineStartsCache: { content: string; starts: number[] } | null = null;

  constructor(options: Partial<ParserOptions> = {}) {
    this.options = { ...DEFAULT_PARSER_OPTIONS, ...options };
  }

  /**
   * Parse the content and return all variables
   * Must be implemented by subclasses
   */
  abstract parse(content: string): ParsedVariable[];

  /**
   * Check if this parser can handle the given file
   * Default implementation checks file extension only
   * Subclasses can override for more complex matching (e.g., EnvParser for .env.local)
   */
  canParse(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();

    // Only check exact extension match for most parsers
    // This prevents false positives like "json-parser.ts" matching JsonParser
    return this.supportedExtensions.includes(ext);
  }

  /**
   * Calculate the 0-based line number of a character index. Newline offsets are
   * built once per content and binary-searched, so parsing a file with N values
   * is O(n + N log n) instead of O(N * n).
   */
  protected getLineNumber(content: string, index: number): number {
    const starts = this.getLineStarts(content);
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  /** Offsets at which each line starts, cached for the current content. */
  private getLineStarts(content: string): number[] {
    if (this.lineStartsCache && this.lineStartsCache.content === content) {
      return this.lineStartsCache.starts;
    }
    const starts = [0];
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        starts.push(i + 1);
      }
    }
    this.lineStartsCache = { content, starts };
    return starts;
  }

  /**
   * Helper to create a ParsedVariable object
   */
  protected createVariable(
    key: string,
    value: string,
    startIndex: number,
    endIndex: number,
    content: string,
    isNested: boolean,
    isCommented: boolean
  ): ParsedVariable {
    return {
      key,
      value,
      startIndex,
      endIndex,
      lineNumber: this.getLineNumber(content, startIndex),
      isNested,
      isCommented,
    };
  }

  /**
   * Update parser options
   */
  setOptions(options: Partial<ParserOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
