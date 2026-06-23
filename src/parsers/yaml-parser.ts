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

    // Push a masked scalar spanning [valueStartIndex, valueStartIndex+rawValue.length).
    const pushScalar = (
      fullKey: string,
      rawValue: string,
      valueStartIndex: number,
      isNested: boolean,
      isCommented: boolean
    ) => {
      variables.push(
        this.createVariable(
          fullKey,
          rawValue,
          valueStartIndex,
          valueStartIndex + rawValue.length,
          content,
          isNested,
          isCommented
        )
      );
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineStart = currentIndex;

      // Skip empty lines and document separators
      const trimmed = line.trim();
      if (!trimmed || trimmed === '---' || trimmed === '...') {
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

      // Sequence / list items: "- scalar" or "- key: value".
      if (!isCommented && (trimmed === '-' || trimmed.startsWith('- '))) {
        const dashMatch = /^(\s*-\s+)/.exec(line);
        if (dashMatch) {
          const prefixLen = dashMatch[1].length;
          const remainder = line.slice(prefixLen);
          const parentKey = keyStack.length > 0 ? keyStack[keyStack.length - 1].key : '';
          const mapMatch = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*(.+)$/.exec(remainder);

          if (mapMatch && mapMatch[2].trim()) {
            // "- key: value" — mask the value part.
            const fullKey = parentKey ? `${parentKey}.${mapMatch[1]}` : mapMatch[1];
            const colonPos = remainder.indexOf(':');
            const loc = this.locateTailValue(line, prefixLen + colonPos + 1);
            if (loc) {
              pushScalar(
                fullKey,
                loc.value,
                lineStart + loc.offsetInLine,
                keyStack.length > 0,
                false
              );
            }
          } else if (!mapMatch) {
            // "- scalar" — mask the scalar value.
            const loc = this.locateTailValue(line, prefixLen);
            if (loc) {
              const listKey = parentKey || 'item';
              pushScalar(
                listKey,
                loc.value,
                lineStart + loc.offsetInLine,
                keyStack.length > 0,
                false
              );
            }
          }
        }
        currentIndex += line.length + 1;
        continue;
      }

      // Parse the line (handle commented lines differently)
      const lineContent = isCommented ? line.replace(/^\s*#\s*/, '') : line;
      const parsed = this.parseLine(lineContent);

      if (!parsed) {
        currentIndex += line.length + 1;
        continue;
      }

      const { key, value, hasValue, valueOffset } = parsed;

      // Build the full key path
      const fullKey = this.buildKeyPath(keyStack, key);

      // Check if depth exceeds maxNestedDepth
      const currentDepth = keyStack.length + 1;
      if (currentDepth > this.options.maxNestedDepth) {
        currentIndex += line.length + 1;
        continue;
      }

      if (hasValue && value !== null) {
        // Block scalars ("key: |" / "key: >"): the value is just the indicator;
        // the body lives on the following more-indented lines, masked as one span.
        const indicator = value.trim();
        if (!isCommented && /^[|>][+-]?\d*$/.test(indicator)) {
          const block = this.consumeBlockScalar(
            lines,
            lineIndex,
            indent,
            currentIndex + line.length + 1
          );
          if (block) {
            pushScalar(
              fullKey,
              content.slice(block.start, block.end),
              block.start,
              keyStack.length > 0,
              false
            );
            currentIndex = block.cursorAfter;
            lineIndex = block.lastLineIndex;
          } else {
            currentIndex += line.length + 1;
          }
          continue;
        }

        // This line has a value
        const actualValueOffset = isCommented
          ? line.indexOf(value, line.indexOf(':') + 1)
          : valueOffset;

        pushScalar(fullKey, value, lineStart + actualValueOffset, keyStack.length > 0, isCommented);
      } else {
        // This is a parent key (no value, will have nested children)
        keyStack.push({ key: fullKey, indent });
      }

      currentIndex += line.length + 1;
    }

    return variables;
  }

  /**
   * Get the indentation level of a line (number of leading spaces)
   */
  private getIndentation(line: string): number {
    // Count leading whitespace; a tab counts as 2 spaces (YAML convention).
    let indent = 0;
    for (const ch of line) {
      if (ch === ' ') {
        indent += 1;
      } else if (ch === '\t') {
        indent += 2;
      } else {
        break;
      }
    }
    return indent;
  }

  /**
   * Locate a trailing scalar value in `line` starting the search at `fromIndex`.
   * Trims surrounding whitespace and a single pair of matching quotes, and
   * returns the cleaned value plus its character offset within the line.
   */
  private locateTailValue(
    line: string,
    fromIndex: number
  ): { value: string; offsetInLine: number } | null {
    const tail = line.slice(fromIndex);
    const leading = tail.length - tail.trimStart().length;
    let value = tail.trim();
    let offset = fromIndex + leading;

    if (!value) {
      return null;
    }

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
      offset += 1;
    }

    if (!value) {
      return null;
    }

    return { value, offsetInLine: offset };
  }

  /**
   * Consume a block scalar body: every following line more-indented than the
   * key line (blank lines included). Returns the source span covering the body
   * (first to last non-blank line), plus the cursor/line position to resume at.
   */
  private consumeBlockScalar(
    lines: string[],
    keyLineIndex: number,
    keyIndent: number,
    nextLineCharStart: number
  ): { start: number; end: number; cursorAfter: number; lastLineIndex: number } | null {
    let cursor = nextLineCharStart;
    let blockStart = -1;
    let blockEnd = -1;
    let lastConsumed = keyLineIndex;

    for (let j = keyLineIndex + 1; j < lines.length; j++) {
      const bl = lines[j];
      const blTrimmed = bl.trim();
      const blIndent = this.getIndentation(bl);

      // A non-blank line indented at/under the key ends the block.
      if (blTrimmed !== '' && blIndent <= keyIndent) {
        break;
      }

      if (blTrimmed !== '') {
        const lead = bl.length - bl.trimStart().length;
        if (blockStart === -1) {
          blockStart = cursor + lead;
        }
        blockEnd = cursor + bl.length;
      }

      cursor += bl.length + 1;
      lastConsumed = j;
    }

    if (blockStart === -1) {
      return null;
    }

    return { start: blockStart, end: blockEnd, cursorAfter: cursor, lastLineIndex: lastConsumed };
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
      adjustedOffset = line.indexOf(rawValue, colonIndex) + 1; // +1 to skip the quote
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
