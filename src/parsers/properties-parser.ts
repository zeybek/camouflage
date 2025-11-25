import { BaseParser } from './base-parser';
import type { ParsedVariable } from './types';

/**
 * Parser for Java properties files and similar formats
 * Supports: .properties, .ini, .conf
 */
export class PropertiesParser extends BaseParser {
  readonly name = 'properties';
  readonly supportedExtensions = ['.properties', '.ini', '.conf'];

  /**
   * Track current section for INI files (e.g., [database])
   */
  private currentSection: string = '';

  /**
   * Override canParse to only match exact extensions
   */
  canParse(fileName: string): boolean {
    const ext = fileName.toLowerCase().split('.').pop();
    return ext === 'properties' || ext === 'ini' || ext === 'conf';
  }

  parse(content: string): ParsedVariable[] {
    const variables: ParsedVariable[] = [];
    this.currentSection = '';

    // Split by lines to handle sections
    const lines = content.split('\n');
    let currentIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for section headers [section]
      const sectionMatch = /^\[([^\]]+)\]$/.exec(trimmedLine);
      if (sectionMatch) {
        this.currentSection = sectionMatch[1];
        currentIndex += line.length + 1; // +1 for newline
        continue;
      }

      // Skip empty lines and pure comment lines
      if (!trimmedLine || /^[#;]/.test(trimmedLine) || trimmedLine.startsWith('//')) {
        // Check for commented properties
        if (this.options.includeCommented) {
          const commentedMatch = /^\s*[#;]\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*[=:]\s*(.+)$/.exec(line);
          if (commentedMatch) {
            const key = this.buildKey(commentedMatch[1]);
            const value = commentedMatch[2].trim();
            const valueStartIndex = currentIndex + line.indexOf(commentedMatch[2]);
            const valueEndIndex = valueStartIndex + commentedMatch[2].length;

            variables.push(
              this.createVariable(key, value, valueStartIndex, valueEndIndex, content, false, true)
            );
          }
        }
        currentIndex += line.length + 1;
        continue;
      }

      // Parse regular properties
      const propertyMatch = /^([a-zA-Z_][a-zA-Z0-9_.-]*)\s*[=:]\s*(.*)$/.exec(trimmedLine);
      if (propertyMatch) {
        const key = this.buildKey(propertyMatch[1]);
        const value = propertyMatch[2].trim();

        // Skip empty values
        if (!value) {
          currentIndex += line.length + 1;
          continue;
        }

        // Find the actual value position in the original line
        const separatorIndex = line.search(/[=:]/);
        const valueStartIndex = currentIndex + separatorIndex + 1;
        // Skip whitespace after separator
        const valueInLine = line.substring(separatorIndex + 1);
        const valueOffset = valueInLine.length - valueInLine.trimStart().length;
        const actualValueStart = valueStartIndex + valueOffset;
        const valueEndIndex = currentIndex + line.length;

        variables.push(
          this.createVariable(key, value, actualValueStart, valueEndIndex, content, false, false)
        );
      }

      currentIndex += line.length + 1;
    }

    return variables;
  }

  /**
   * Build the full key including section prefix
   */
  private buildKey(key: string): string {
    if (this.currentSection) {
      return `${this.currentSection}.${key}`;
    }
    return key;
  }
}
