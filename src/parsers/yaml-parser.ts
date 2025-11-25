import { BaseParser } from './base-parser';
import { ParsedVariable, ParserOptions } from './types';

/**
 * Parser for YAML configuration files
 * Supports nested keys using indentation tracking
 */
export class YamlParser extends BaseParser {
  readonly name = 'yaml';
  readonly supportedExtensions = ['.yaml', '.yml'];

  constructor(options: Partial<ParserOptions> = {}) {
    super(options);
  }

  parse(content: string): ParsedVariable[] {
    const variables: ParsedVariable[] = [];
    const lines = content.split('\n');
    const keyStack: { key: string; indent: number }[] = [];
    let currentIndex = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineStart = currentIndex;

      // Skip empty lines and document separators
      if (!line.trim() || line.trim() === '---' || line.trim() === '...') {
        currentIndex += line.length + 1;
        continue;
      }

      // Check for comments
      const isCommented = /^\s*#/.test(line);
      if (isCommented && !this.options.includeCommented) {
        currentIndex += line.length + 1;
        continue;
      }

      // Calculate indentation
      const indent = this.getIndentation(line);

      // Remove items from stack that have same or greater indentation
      while (keyStack.length > 0 && keyStack[keyStack.length - 1].indent >= indent) {
        keyStack.pop();
      }

      // Parse the line (handle commented lines differently)
      const lineContent = isCommented ? line.replace(/^\s*#\s*/, '') : line;
      const parsed = this.parseLine(lineContent);

      if (parsed) {
        const { key, value, hasValue, valueOffset } = parsed;

        // Build the full key path
        const fullKey = this.buildKeyPath(keyStack, key);

        // Check if depth exceeds maxNestedDepth
        const currentDepth = keyStack.length + 1;
        if (currentDepth > this.options.maxNestedDepth) {
          currentIndex += line.length + 1;
          continue;
        }

        if (hasValue && value !== null && value !== undefined) {
          // This line has a value
          const actualValueOffset = isCommented
            ? line.indexOf(value, line.indexOf(':') + 1)
            : valueOffset;

          const valueStartIndex = lineStart + actualValueOffset;
          const valueEndIndex = valueStartIndex + value.length;

          variables.push(
            this.createVariable(
              fullKey,
              value,
              valueStartIndex,
              valueEndIndex,
              content,
              keyStack.length > 0,
              isCommented
            )
          );
        } else {
          // This is a parent key (no value, will have nested children)
          keyStack.push({ key: fullKey, indent });
        }
      }

      currentIndex += line.length + 1;
    }

    return variables;
  }

  /**
   * Get the indentation level of a line (number of leading spaces)
   */
  private getIndentation(line: string): number {
    const match = /^(\s*)/.exec(line);
    if (match) {
      // Count spaces (tabs count as 2 spaces for YAML convention)
      return match[1].replace(/\t/g, '  ').length;
    }
    return 0;
  }

  /**
   * Parse a single YAML line
   */
  private parseLine(
    line: string
  ): { key: string; value: string | null; hasValue: boolean; valueOffset: number } | null {
    const trimmed = line.trim();

    // Skip list items for now (- item)
    if (trimmed.startsWith('-')) {
      return null;
    }

    // Match key: value or key:
    const match = /^([a-zA-Z_][a-zA-Z0-9_.-]*)\s*:\s*(.*)$/.exec(trimmed);
    if (!match) {
      return null;
    }

    const key = match[1];
    let value = match[2].trim();
    const hasValue = value.length > 0;

    // Handle quoted strings
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Calculate value offset in original line
    const colonIndex = line.indexOf(':');
    const afterColon = line.substring(colonIndex + 1);
    const valueOffset = colonIndex + 1 + (afterColon.length - afterColon.trimStart().length);

    // Adjust for quotes if present
    const rawValue = line.substring(valueOffset).trim();
    let adjustedOffset = valueOffset;
    if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
      adjustedOffset = line.indexOf(rawValue) + 1; // +1 to skip the quote
    } else {
      adjustedOffset = line.indexOf(rawValue, colonIndex);
    }

    return {
      key,
      value: hasValue ? value : null,
      hasValue,
      valueOffset: adjustedOffset,
    };
  }

  /**
   * Build the full key path from the stack and current key
   */
  private buildKeyPath(stack: { key: string; indent: number }[], currentKey: string): string {
    if (stack.length === 0) {
      return currentKey;
    }
    return `${stack[stack.length - 1].key}.${currentKey}`;
  }
}
