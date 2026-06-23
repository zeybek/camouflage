/**
 * Pattern matching utilities for environment variable keys
 */

/**
 * Escape regex metacharacters EXCEPT '*', which is handled separately as a
 * glob wildcard.
 */
function escapeGlob(str: string): string {
  return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a glob-style pattern to a case-insensitive, anchored RegExp.
 * '*' is a wildcard matching any run of characters and may appear anywhere in
 * the pattern (e.g. KEY*, *KEY, *KEY*, API*KEY). Every other character is
 * matched literally.
 */
export function patternToRegex(pattern: string): RegExp {
  const regexPattern = escapeGlob(pattern).replace(/\*/g, '.*');
  return new RegExp('^' + regexPattern + '$', 'i');
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

  return patterns.some((pattern) => patternToRegex(pattern).test(key));
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

    return patterns.some((pattern) => this.getRegex(pattern).test(key));
  }

  /**
   * Clear the pattern cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
