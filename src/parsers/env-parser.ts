import { BaseParser } from './base-parser';
import type { ParsedVariable } from './types';

/**
 * Parser for environment variable files
 * Supports: .env, .env.*, .envrc, .sh (shell scripts with exports)
 */
export class EnvParser extends BaseParser {
  readonly name = 'env';
  readonly supportedExtensions = ['.env', '.envrc', '.sh'];

  /**
   * Regular expression to match environment variable declarations
   * Matches: KEY=value, export KEY=value (with optional leading whitespace for indented code)
   */
  private readonly ENV_VAR_REGEX =
    /^[ \t]*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*(.*)$/gm;

  /**
   * Regular expression to match commented environment variable declarations
   * Matches: # KEY=value, # export KEY=value
   */
  private readonly COMMENTED_ENV_VAR_REGEX =
    /^[ \t]*#[ \t]*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*(.*)$/gm;

  parse(content: string): ParsedVariable[] {
    const variables: ParsedVariable[] = [];

    // Parse regular environment variables
    this.parseWithRegex(content, this.ENV_VAR_REGEX, variables, false);

    // Parse commented environment variables if enabled
    if (this.options.includeCommented) {
      this.parseWithRegex(content, this.COMMENTED_ENV_VAR_REGEX, variables, true);
    }

    return variables;
  }

  /**
   * Parse content using a regex and add results to variables array
   */
  private parseWithRegex(
    content: string,
    regex: RegExp,
    variables: ParsedVariable[],
    isCommented: boolean
  ): void {
    // Reset regex lastIndex to ensure fresh search
    regex.lastIndex = 0;

    let match: RegExpExecArray | null = regex.exec(content);
    while (match !== null) {
      const key = match[1];
      let value = match[2];

      // Skip empty values
      if (value.trim()) {
        // Calculate value position
        const fullMatch = match[0];
        const matchStart = match.index;
        const equalsIndex = fullMatch.indexOf('=');
        const valueStartIndex = matchStart + equalsIndex + 1;
        let valueEndIndex = matchStart + fullMatch.length;

        const firstChar = value[0];
        if ((firstChar === '"' || firstChar === "'") && value.indexOf(firstChar, 1) === -1) {
          // Opening quote with no closing quote on this line: a multi-line value.
          // Extend the mask to the closing quote.
          const closeIdx = content.indexOf(firstChar, valueStartIndex + 1);
          if (closeIdx >= valueEndIndex) {
            valueEndIndex = closeIdx + 1;
            value = content.slice(valueStartIndex, valueEndIndex);
            regex.lastIndex = valueEndIndex;
          }
        } else if (value.endsWith('\\')) {
          // Shell-style backslash line continuation: absorb the continued lines.
          let lineEnd = content.indexOf('\n', valueEndIndex);
          while (lineEnd !== -1) {
            const nextNl = content.indexOf('\n', lineEnd + 1);
            const sliceEnd = nextNl === -1 ? content.length : nextNl;
            valueEndIndex = sliceEnd;
            if (
              !content
                .slice(lineEnd + 1, sliceEnd)
                .trimEnd()
                .endsWith('\\')
            ) {
              break;
            }
            lineEnd = nextNl;
          }
          value = content.slice(valueStartIndex, valueEndIndex);
          regex.lastIndex = valueEndIndex;
        }

        variables.push(
          this.createVariable(
            key,
            value,
            valueStartIndex,
            valueEndIndex,
            content,
            false,
            isCommented
          )
        );
      }

      match = regex.exec(content);
    }
  }

  /**
   * Override canParse to handle .env.* patterns
   */
  canParse(fileName: string): boolean {
    const lowerFileName = fileName.toLowerCase();
    const baseName = lowerFileName.split('/').pop() || lowerFileName;

    // Check for .env files and variants
    if (baseName === '.env' || baseName.startsWith('.env.') || baseName.endsWith('.env')) {
      return true;
    }

    // Check for .envrc
    if (baseName === '.envrc' || baseName.includes('.envrc')) {
      return true;
    }

    // Check for .sh files
    if (baseName.endsWith('.sh')) {
      return true;
    }

    return false;
  }
}
