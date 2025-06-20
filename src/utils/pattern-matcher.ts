/**
 * Pattern matching utilities for environment variable keys
 */

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a pattern to a regex pattern with proper escaping
 * @param pattern - Pattern like *KEY*, KEY*, *KEY, or KEY
 * @returns RegExp for matching
 */
export function patternToRegex(pattern: string): RegExp {
  let regexPattern: string;

  if (pattern.startsWith('*') && pattern.endsWith('*')) {
    // *KEY* -> contains KEY anywhere (case insensitive)
    const innerPattern = pattern.slice(1, -1);
    regexPattern = escapeRegex(innerPattern);
  } else if (pattern.startsWith('*')) {
    // *KEY -> ends with KEY (case insensitive)
    const innerPattern = pattern.slice(1);
    regexPattern = escapeRegex(innerPattern) + '$';
  } else if (pattern.endsWith('*')) {
    // KEY* -> starts with KEY (case insensitive)
    const innerPattern = pattern.slice(0, -1);
    regexPattern = '^' + escapeRegex(innerPattern);
  } else {
    // KEY -> exact match (case insensitive)
    regexPattern = '^' + escapeRegex(pattern) + '$';
  }

  return new RegExp(regexPattern, 'i');
}

/**
 * Check if a key matches any of the given patterns
 * @param key - Environment variable key to test
 * @param patterns - Array of patterns to match against
 * @returns true if key matches any pattern
 */
export function matchesAnyPattern(key: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => {
    try {
      const regex = patternToRegex(pattern);
      return regex.test(key);
    } catch (error) {
      // Log error and continue with next pattern
      console.warn(`Invalid pattern "${pattern}":`, error);
      return false;
    }
  });
}

/**
 * Create cached pattern matchers for better performance
 */
export class PatternMatcher {
  private cache = new Map<string, RegExp>();

  /**
   * Get or create a regex for the given pattern
   */
  private getRegex(pattern: string): RegExp {
    if (this.cache.has(pattern)) {
      return this.cache.get(pattern)!;
    }

    const regex = patternToRegex(pattern);
    this.cache.set(pattern, regex);
    return regex;
  }

  /**
   * Test if key matches any of the patterns (with caching)
   */
  public matches(key: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
      return false;
    }

    return patterns.some((pattern) => {
      try {
        const regex = this.getRegex(pattern);
        return regex.test(key);
      } catch (error) {
        console.warn(`Invalid pattern "${pattern}":`, error);
        return false;
      }
    });
  }

  /**
   * Clear the pattern cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
