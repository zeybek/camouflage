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
   * Helper to calculate line number from index
   */
  protected getLineNumber(content: string, index: number): number {
    const substring = content.substring(0, index);
    return substring.split('\n').length - 1;
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
    isNested: boolean = false,
    isCommented: boolean = false
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
