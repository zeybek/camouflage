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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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
      const split = this.splitKeyValue(lineContent, line);

      if (!split) {
        currentIndex += line.length + 1;
        continue;
      }

      const { key, valueOffset, rawValue } = split;
      const fullKey = currentSection ? `${currentSection}.${key}` : key;
      const isNested = currentSection.length > 0 || key.includes('.');
      const valueStartChar = lineStart + valueOffset;

      // Multi-line constructs (""" / ''' strings, multi-line arrays) that do
      // not close on this line: mask across the following lines.
      const ml = this.detectMultiline(rawValue);
      if (ml && !isCommented) {
        const span = this.consumeMultiline(content, valueStartChar, ml.openLen, ml.closeToken);
        if (span) {
          variables.push(
            this.createVariable(
              fullKey,
              content.slice(span.start, span.end),
              span.start,
              span.end,
              content,
              isNested,
              isCommented
            )
          );
          currentIndex = span.cursorAfter;
          i = span.lastLineIndex;
          continue;
        }
      }

      // Single-line value
      const { value, quoteOffset } = this.parseValue(rawValue);
      const valueStartIndex = valueStartChar + quoteOffset;
      const valueEndIndex = valueStartIndex + value.length;

      variables.push(
        this.createVariable(
          fullKey,
          value,
          valueStartIndex,
          valueEndIndex,
          content,
          isNested,
          isCommented
        )
      );

      currentIndex += line.length + 1;
    }

    return variables;
  }

  /**
   * Split a TOML line into its key and the position/text of its value. The '='
   * separator is located after the key token, so a quoted key containing '='
   * (e.g. `"a=b" = "secret"`) is handled correctly.
   */
  private splitKeyValue(
    trimmedLine: string,
    originalLine: string
  ): { key: string; valueOffset: number; rawValue: string } | null {
    const match = /^([a-zA-Z_][a-zA-Z0-9_.-]*|"[^"]+"|'[^']+')\s*=\s*(.+)$/.exec(trimmedLine);
    if (!match) {
      return null;
    }

    const rawKey = match[1];
    let key = rawKey;
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }

    // Find '=' AFTER the key token (not the first '=' in the line).
    const keyTokenStart = originalLine.indexOf(rawKey);
    /* istanbul ignore next -- rawKey always appears in originalLine, so keyTokenStart is never < 0 */
    const searchFrom = keyTokenStart >= 0 ? keyTokenStart + rawKey.length : 0;
    const equalsIndex = originalLine.indexOf('=', searchFrom);
    /* istanbul ignore if -- the regex above guarantees a '=' is present */
    if (equalsIndex === -1) {
      return null;
    }

    const afterEquals = originalLine.substring(equalsIndex + 1);
    const valueInLine = afterEquals.trimStart();
    const valueOffset = equalsIndex + 1 + (afterEquals.length - valueInLine.length);

    return { key, valueOffset, rawValue: valueInLine.trimEnd() };
  }

  /**
   * Detect a value that opens a multi-line construct but does not close it on
   * the same line.
   */
  private detectMultiline(rawValue: string): { openLen: number; closeToken: string } | null {
    if (rawValue.startsWith('"""')) {
      if (rawValue.indexOf('"""', 3) === -1) {
        return { openLen: 3, closeToken: '"""' };
      }
    } else if (rawValue.startsWith("'''")) {
      if (rawValue.indexOf("'''", 3) === -1) {
        return { openLen: 3, closeToken: "'''" };
      }
    } else if (rawValue.startsWith('[')) {
      if (rawValue.indexOf(']') === -1) {
        return { openLen: 1, closeToken: ']' };
      }
    }
    return null;
  }

  /**
   * Span from the value start through the closing token of a multi-line
   * construct (delimiters included).
   */
  private consumeMultiline(
    content: string,
    valueStartChar: number,
    openLen: number,
    closeToken: string
  ): { start: number; end: number; cursorAfter: number; lastLineIndex: number } | null {
    const closeStart = content.indexOf(closeToken, valueStartChar + openLen);
    if (closeStart === -1) {
      return null;
    }

    const end = closeStart + closeToken.length;
    const nlAfter = content.indexOf('\n', end);
    const cursorAfter = nlAfter === -1 ? content.length : nlAfter + 1;
    const lastLineIndex = content.slice(0, closeStart).split('\n').length - 1;

    return { start: valueStartChar, end, cursorAfter, lastLineIndex };
  }

  /**
   * Parse a single-line TOML value and return the unquoted value plus the
   * offset of the value relative to the start of the raw value text.
   */
  private parseValue(rawValue: string): { value: string; quoteOffset: number } {
    // Basic string (double quotes) — skip escaped quotes when finding the end.
    if (rawValue.startsWith('"') && !rawValue.startsWith('"""')) {
      let i = 1;
      while (i < rawValue.length) {
        if (rawValue[i] === '\\') {
          i += 2;
          continue;
        }
        if (rawValue[i] === '"') {
          return { value: rawValue.substring(1, i), quoteOffset: 1 };
        }
        i++;
      }
    }

    // Literal string (single quotes) — literals have no escapes in TOML.
    if (rawValue.startsWith("'") && !rawValue.startsWith("'''")) {
      const endQuote = rawValue.indexOf("'", 1);
      if (endQuote !== -1) {
        return {
          value: rawValue.substring(1, endQuote),
          quoteOffset: 1,
        };
      }
    }

    // Multi-line basic string that closes on the same line
    if (rawValue.startsWith('"""')) {
      const endQuote = rawValue.indexOf('"""', 3);
      if (endQuote !== -1) {
        return {
          value: rawValue.substring(3, endQuote),
          quoteOffset: 3,
        };
      }
    }

    // Multi-line literal string that closes on the same line
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
    // Remove inline comments
    let value = rawValue;
    const commentIndex = value.indexOf('#');
    if (commentIndex !== -1) {
      value = value.substring(0, commentIndex).trim();
    }

    return {
      value,
      quoteOffset: 0,
    };
  }
}
