import { BaseParser } from './base-parser';
import { ParsedVariable } from './types';

/**
 * Parser for TOML configuration files
 * Supports sections and nested keys
 */
export class TomlParser extends BaseParser {
  readonly name = 'toml';
  readonly supportedExtensions = ['.toml'];

  parse(content: string): ParsedVariable[] {
    const variables: ParsedVariable[] = [];
    const lines = content.split('\n');
    let currentSection = '';
    let currentIndex = 0;

    for (const line of lines) {
      const lineStart = currentIndex;
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        currentIndex += line.length + 1;
        continue;
      }

      // Check for comments
      const isCommented = trimmed.startsWith('#');
      if (isCommented && !this.options.includeCommented) {
        currentIndex += line.length + 1;
        continue;
      }

      // Check for section headers [section] or [section.subsection]
      const sectionMatch = /^\[([^\]]+)\]$/.exec(trimmed);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        currentIndex += line.length + 1;
        continue;
      }

      // Check for array of tables [[section]]
      const arrayTableMatch = /^\[\[([^\]]+)\]\]$/.exec(trimmed);
      if (arrayTableMatch) {
        currentSection = arrayTableMatch[1];
        currentIndex += line.length + 1;
        continue;
      }

      // Parse key-value pairs
      const lineContent = isCommented ? trimmed.replace(/^#\s*/, '') : trimmed;
      const parsed = this.parseKeyValue(lineContent, line, lineStart);

      if (parsed) {
        const { key, value, valueStartIndex, valueEndIndex } = parsed;
        const fullKey = currentSection ? `${currentSection}.${key}` : key;

        variables.push(
          this.createVariable(
            fullKey,
            value,
            valueStartIndex,
            valueEndIndex,
            content,
            currentSection.length > 0 || key.includes('.'),
            isCommented
          )
        );
      }

      currentIndex += line.length + 1;
    }

    return variables;
  }

  /**
   * Parse a TOML key-value pair
   */
  private parseKeyValue(
    trimmedLine: string,
    originalLine: string,
    lineStart: number
  ): { key: string; value: string; valueStartIndex: number; valueEndIndex: number } | null {
    // Match key = value patterns
    // Key can be: bare key, dotted key, or quoted key
    const match = /^([a-zA-Z_][a-zA-Z0-9_.-]*|"[^"]+"|'[^']+')\s*=\s*(.+)$/.exec(trimmedLine);
    if (!match) {
      return null;
    }

    let key = match[1];
    const rawValue = match[2].trim();

    // Remove quotes from key if present
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }

    // Parse the value
    const { value, quoteOffset } = this.parseValue(rawValue);

    // Calculate positions in original line
    const equalsIndex = originalLine.indexOf('=');
    const afterEquals = originalLine.substring(equalsIndex + 1);
    const valueInLine = afterEquals.trimStart();
    const valueOffset = equalsIndex + 1 + (afterEquals.length - valueInLine.length);

    // Adjust for quotes
    const valueStartIndex = lineStart + valueOffset + quoteOffset;
    const valueEndIndex = valueStartIndex + value.length;

    return { key, value, valueStartIndex, valueEndIndex };
  }

  /**
   * Parse a TOML value and return the unquoted value
   */
  private parseValue(rawValue: string): { value: string; quoteOffset: number } {
    // Basic string (double quotes)
    if (rawValue.startsWith('"') && !rawValue.startsWith('"""')) {
      const endQuote = rawValue.indexOf('"', 1);
      if (endQuote !== -1) {
        return {
          value: rawValue.substring(1, endQuote),
          quoteOffset: 1,
        };
      }
    }

    // Literal string (single quotes)
    if (rawValue.startsWith("'") && !rawValue.startsWith("'''")) {
      const endQuote = rawValue.indexOf("'", 1);
      if (endQuote !== -1) {
        return {
          value: rawValue.substring(1, endQuote),
          quoteOffset: 1,
        };
      }
    }

    // Multi-line basic string
    if (rawValue.startsWith('"""')) {
      const endQuote = rawValue.indexOf('"""', 3);
      if (endQuote !== -1) {
        return {
          value: rawValue.substring(3, endQuote),
          quoteOffset: 3,
        };
      }
    }

    // Multi-line literal string
    if (rawValue.startsWith("'''")) {
      const endQuote = rawValue.indexOf("'''", 3);
      if (endQuote !== -1) {
        return {
          value: rawValue.substring(3, endQuote),
          quoteOffset: 3,
        };
      }
    }

    // Unquoted value (number, boolean, date, etc.)
    // For these, we return the raw value
    // Remove inline comments
    const commentIndex = rawValue.indexOf('#');
    if (commentIndex !== -1) {
      rawValue = rawValue.substring(0, commentIndex).trim();
    }

    return {
      value: rawValue,
      quoteOffset: 0,
    };
  }
}
