import { BaseParser } from './base-parser';
import type { ParsedVariable, ParserOptions } from './types';

/**
 * Parser for JSON configuration files. Supports nested keys
 * (e.g. database.connection.password).
 *
 * A position-aware scanner records the exact source offsets of every string and
 * number leaf, so escaped strings, integer-like keys, array elements, duplicate
 * keys and numeric values are all masked. Booleans and null are left visible.
 * When nesting exceeds `maxNestedDepth` the value is still masked but the dotted
 * key path stops growing.
 */
export class JsonParser extends BaseParser {
  readonly name = 'json';
  readonly supportedExtensions = ['.json'];

  constructor(options: Partial<ParserOptions> = {}) {
    super(options);
  }

  parse(content: string): ParsedVariable[] {
    const variables: ParsedVariable[] = [];

    try {
      const scanner = new JsonScanner(content, this.options.maxNestedDepth);
      for (const leaf of scanner.scan()) {
        variables.push(
          this.createVariable(
            leaf.key,
            content.slice(leaf.startIndex, leaf.endIndex),
            leaf.startIndex,
            leaf.endIndex,
            content,
            leaf.depth > 0,
            false
          )
        );
      }
    } catch {
      // Malformed JSON (or JSONC with comments / multiple top-level values):
      // fall back to a best-effort regex pass.
      this.parseWithRegex(content, variables);
    }

    return variables;
  }

  /**
   * Fallback regex-based parsing for invalid JSON. Tolerates escape sequences
   * inside the value so the whole value is captured.
   */
  private parseWithRegex(content: string, variables: ParsedVariable[]): void {
    const regex = /"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"/g;

    let match: RegExpExecArray | null = regex.exec(content);
    while (match !== null) {
      const key = match[1];
      const rawValue = match[2];
      const colonIndex = match[0].indexOf(':');
      const valuePartStart = match[0].indexOf('"', colonIndex + 1);
      const valueStartIndex = match.index + valuePartStart + 1;
      const valueEndIndex = valueStartIndex + rawValue.length;

      variables.push(
        this.createVariable(key, rawValue, valueStartIndex, valueEndIndex, content, false, false)
      );

      match = regex.exec(content);
    }
  }
}

interface JsonLeaf {
  key: string;
  startIndex: number;
  endIndex: number;
  depth: number;
}

/** Hard recursion guard against pathologically deep input (stack safety). */
const MAX_RECURSION = 500;

/**
 * Minimal position-aware JSON scanner. Walks the source once and records the
 * exact [startIndex, endIndex) source span of every string and number leaf.
 */
class JsonScanner {
  private pos = 0;
  private readonly leaves: JsonLeaf[] = [];

  constructor(
    private readonly src: string,
    private readonly maxDepth: number
  ) {}

  scan(): JsonLeaf[] {
    this.skipWs();
    if (this.pos >= this.src.length) {
      return this.leaves;
    }

    const ch = this.src[this.pos];
    if (ch === '{') {
      this.parseObject('', 0);
    } else if (ch === '[') {
      this.parseArray('', 0);
    } else if (ch === '"') {
      const span = this.parseString();
      this.pushLeaf('', span.start, span.end, 0);
    } else if (this.isNumberStart(ch)) {
      const span = this.parseNumber();
      this.pushLeaf('', span.start, span.end, 0);
    } else {
      this.consumeLiteral();
    }

    // Any trailing non-whitespace means this is not a single valid document
    // (e.g. two concatenated objects). Bail out so the regex fallback runs and
    // covers every pair rather than only the first document.
    this.skipWs();
    if (this.pos < this.src.length) {
      throw new Error('trailing content after top-level value');
    }

    return this.leaves;
  }

  /** Parse a value that lives under `keyPath`; a leaf here is tagged `depth`. */
  private parseChildValue(keyPath: string, depth: number): void {
    if (depth > MAX_RECURSION) {
      throw new Error('too deep');
    }
    this.skipWs();
    const ch = this.src[this.pos];
    if (ch === '{') {
      this.parseObject(keyPath, depth + 1);
    } else if (ch === '[') {
      this.parseArray(keyPath, depth + 1);
    } else if (ch === '"') {
      const span = this.parseString();
      this.pushLeaf(keyPath, span.start, span.end, depth);
    } else if (this.isNumberStart(ch)) {
      const span = this.parseNumber();
      this.pushLeaf(keyPath, span.start, span.end, depth);
    } else {
      // true / false / null carry no secret -> consumed but not masked.
      this.consumeLiteral();
    }
  }

  private parseObject(parentPath: string, depth: number): void {
    this.pos++; // consume '{'
    this.skipWs();
    if (this.src[this.pos] === '}') {
      this.pos++;
      return;
    }

    for (;;) {
      this.skipWs();
      if (this.src[this.pos] !== '"') {
        throw new Error('expected object key');
      }
      const keySpan = this.parseString();
      const keyName = this.src.slice(keySpan.start, keySpan.end);

      this.skipWs();
      if (this.src[this.pos] !== ':') {
        throw new Error('expected colon');
      }
      this.pos++; // consume ':'

      const childPath =
        depth < this.maxDepth ? (parentPath ? `${parentPath}.${keyName}` : keyName) : parentPath;
      this.parseChildValue(childPath, depth);

      this.skipWs();
      const sep = this.src[this.pos];
      if (sep === ',') {
        this.pos++;
        continue;
      }
      if (sep === '}') {
        this.pos++;
        return;
      }
      throw new Error('expected , or }');
    }
  }

  private parseArray(parentPath: string, depth: number): void {
    this.pos++; // consume '['
    this.skipWs();
    if (this.src[this.pos] === ']') {
      this.pos++;
      return;
    }

    let index = 0;
    for (;;) {
      const childPath =
        depth < this.maxDepth ? (parentPath ? `${parentPath}.${index}` : `${index}`) : parentPath;
      this.parseChildValue(childPath, depth);

      this.skipWs();
      const sep = this.src[this.pos];
      if (sep === ',') {
        this.pos++;
        index++;
        continue;
      }
      if (sep === ']') {
        this.pos++;
        return;
      }
      throw new Error('expected , or ]');
    }
  }

  /**
   * Parse a string starting at the current '"'. Returns the inner span
   * [start, end) excluding the quotes and leaves `pos` past the closing quote.
   * The span is the RAW source text (escapes included), which is exactly what
   * must be masked.
   */
  private parseString(): { start: number; end: number } {
    this.pos++; // consume opening quote
    const start = this.pos;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === '\\') {
        this.pos += 2; // skip the backslash and the escaped character
        continue;
      }
      if (c === '"') {
        const end = this.pos;
        this.pos++; // consume closing quote
        return { start, end };
      }
      this.pos++;
    }
    throw new Error('unterminated string');
  }

  private parseNumber(): { start: number; end: number } {
    const start = this.pos;
    while (this.pos < this.src.length && /[-+0-9.eE]/.test(this.src[this.pos])) {
      this.pos++;
    }
    return { start, end: this.pos };
  }

  private consumeLiteral(): void {
    if (this.src.startsWith('true', this.pos)) {
      this.pos += 4;
    } else if (this.src.startsWith('false', this.pos)) {
      this.pos += 5;
    } else if (this.src.startsWith('null', this.pos)) {
      this.pos += 4;
    } else {
      throw new Error(`unexpected token at ${this.pos}`);
    }
  }

  private isNumberStart(ch: string): boolean {
    return ch === '-' || (ch >= '0' && ch <= '9');
  }

  private pushLeaf(key: string, start: number, end: number, depth: number): void {
    this.leaves.push({ key, startIndex: start, endIndex: end, depth });
  }

  private skipWs(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) {
      this.pos++;
    }
  }
}
