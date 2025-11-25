import { BaseParser } from './base-parser';
import type { ParsedVariable, ParserOptions } from './types';

/**
 * Parser for JSON configuration files
 * Supports nested keys (e.g., database.connection.password)
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
      // Parse the JSON to get structure
      const parsed = JSON.parse(content);

      // Recursively extract variables
      this.extractVariables(parsed, content, '', 0, variables);
    } catch {
      // If JSON is invalid, try to parse what we can using regex
      this.parseWithRegex(content, variables);
    }

    return variables;
  }

  /**
   * Recursively extract variables from parsed JSON
   */
  private extractVariables(
    obj: unknown,
    content: string,
    keyPrefix: string,
    depth: number,
    variables: ParsedVariable[]
  ): void {
    if (depth > this.options.maxNestedDepth) {
      return;
    }

    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

      if (typeof value === 'string') {
        // Find the position of this key-value in the original content
        const position = this.findValuePosition(content, key, value);
        if (position) {
          variables.push(
            this.createVariable(
              fullKey,
              value,
              position.startIndex,
              position.endIndex,
              content,
              depth > 0,
              false
            )
          );
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recurse into nested objects
        this.extractVariables(value, content, fullKey, depth + 1, variables);
      }
    }
  }

  /**
   * Find the position of a value in the JSON content
   */
  private findValuePosition(
    content: string,
    key: string,
    value: string
  ): { startIndex: number; endIndex: number } | null {
    // Escape special regex characters in key and value
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match "key": "value" pattern
    const pattern = new RegExp(`"${escapedKey}"\\s*:\\s*"(${escapedValue})"`, 'g');

    const match: RegExpExecArray | null = pattern.exec(content);
    if (match) {
      // Find the start of the value (position after the opening quote)
      const colonIndex = match[0].indexOf(':');
      const valueQuoteStart = match[0].indexOf('"', colonIndex + 1);
      const valueStartIndex = match.index + valueQuoteStart + 1;
      const valueEndIndex = valueStartIndex + value.length;

      return { startIndex: valueStartIndex, endIndex: valueEndIndex };
    }

    return null;
  }

  /**
   * Fallback regex-based parsing for invalid JSON
   */
  private parseWithRegex(content: string, variables: ParsedVariable[]): void {
    // Simple regex to find "key": "value" patterns
    const simpleRegex = /"([^"]+)"\s*:\s*"([^"]*)"/g;

    let match: RegExpExecArray | null = simpleRegex.exec(content);
    while (match !== null) {
      const key = match[1];
      const value = match[2];

      const matchStart = match.index;
      const colonIndex = match[0].indexOf(':');
      const valuePartStart = match[0].indexOf('"', colonIndex + 1);
      const valueStartIndex = matchStart + valuePartStart + 1;
      const valueEndIndex = valueStartIndex + value.length;

      variables.push(
        this.createVariable(key, value, valueStartIndex, valueEndIndex, content, false, false)
      );

      match = simpleRegex.exec(content);
    }
  }
}
