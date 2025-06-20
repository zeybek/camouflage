import { describe, expect, it } from '@jest/globals';
import { matchesAnyPattern, PatternMatcher, patternToRegex } from '../pattern-matcher';

describe('pattern-matcher', () => {
  describe('patternToRegex', () => {
    it('should handle exact match patterns', () => {
      const regex = patternToRegex('API_KEY');

      expect(regex.test('API_KEY')).toBe(true);
      expect(regex.test('api_key')).toBe(true); // case insensitive
      expect(regex.test('MY_API_KEY')).toBe(false);
      expect(regex.test('API_KEY_2')).toBe(false);
    });

    it('should handle starts with patterns', () => {
      const regex = patternToRegex('API*');

      expect(regex.test('API')).toBe(true);
      expect(regex.test('API_KEY')).toBe(true);
      expect(regex.test('API_SECRET')).toBe(true);
      expect(regex.test('MY_API')).toBe(false);
      expect(regex.test('api_key')).toBe(true); // case insensitive
    });

    it('should handle ends with patterns', () => {
      const regex = patternToRegex('*KEY');

      expect(regex.test('KEY')).toBe(true);
      expect(regex.test('API_KEY')).toBe(true);
      expect(regex.test('SECRET_KEY')).toBe(true);
      expect(regex.test('KEY_VALUE')).toBe(false);
      expect(regex.test('secret_key')).toBe(true); // case insensitive
    });

    it('should handle contains patterns', () => {
      const regex = patternToRegex('*SECRET*');

      expect(regex.test('SECRET')).toBe(true);
      expect(regex.test('MY_SECRET')).toBe(true);
      expect(regex.test('SECRET_KEY')).toBe(true);
      expect(regex.test('MY_SECRET_VALUE')).toBe(true);
      expect(regex.test('PASSWORD')).toBe(false);
      expect(regex.test('my_secret_key')).toBe(true); // case insensitive
    });

    it('should escape special regex characters', () => {
      const regex = patternToRegex('API.KEY');

      expect(regex.test('API.KEY')).toBe(true);
      expect(regex.test('APIXKEY')).toBe(false); // . should not be treated as wildcard
    });

    it('should handle patterns with special characters', () => {
      const regex = patternToRegex('*DB[URL]*');

      expect(regex.test('DB[URL]')).toBe(true);
      expect(regex.test('MY_DB[URL]_CONFIG')).toBe(true);
      expect(regex.test('DBXURLX')).toBe(false); // brackets should be literal
    });

    it('should handle empty patterns', () => {
      const regex = patternToRegex('');
      expect(regex.test('')).toBe(true);
      expect(regex.test('anything')).toBe(false);
    });

    it('should handle single asterisk pattern', () => {
      const regex = patternToRegex('*');
      expect(regex.test('')).toBe(true);
      expect(regex.test('anything')).toBe(true);
    });
  });

  describe('matchesAnyPattern', () => {
    it('should return false for empty patterns array', () => {
      expect(matchesAnyPattern('API_KEY', [])).toBe(false);
    });

    it('should match against multiple patterns', () => {
      const patterns = ['*KEY*', '*TOKEN*', 'PASSWORD'];

      expect(matchesAnyPattern('API_KEY', patterns)).toBe(true);
      expect(matchesAnyPattern('SECRET_TOKEN', patterns)).toBe(true);
      expect(matchesAnyPattern('PASSWORD', patterns)).toBe(true);
      expect(matchesAnyPattern('NODE_ENV', patterns)).toBe(false);
    });

    it('should handle case insensitive matching', () => {
      const patterns = ['*KEY*', 'PASSWORD'];

      expect(matchesAnyPattern('api_key', patterns)).toBe(true);
      expect(matchesAnyPattern('password', patterns)).toBe(true);
      expect(matchesAnyPattern('My_Secret_Key', patterns)).toBe(true);
    });

    it('should handle invalid patterns gracefully', () => {
      // Mock console.warn to avoid cluttering test output
      const originalWarn = console.warn;
      console.warn = jest.fn();

      // This should not throw, just log warning and continue
      expect(matchesAnyPattern('API_KEY', ['[invalid', '*KEY*'])).toBe(true);

      console.warn = originalWarn;
    });

    it('should handle empty pattern strings', () => {
      const patterns = ['', '*KEY*'];
      expect(matchesAnyPattern('API_KEY', patterns)).toBe(true);
      expect(matchesAnyPattern('', patterns)).toBe(true); // empty pattern matches empty string
    });
  });

  describe('PatternMatcher class', () => {
    let matcher: PatternMatcher;

    beforeEach(() => {
      matcher = new PatternMatcher();
    });

    it('should cache regex patterns for performance', () => {
      const patterns = ['*KEY*'];

      // First call
      const result1 = matcher.matches('API_KEY', patterns);
      // Second call should use cached regex
      const result2 = matcher.matches('SECRET_KEY', patterns);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should clear cache correctly', () => {
      const patterns = ['*KEY*'];

      matcher.matches('API_KEY', patterns);
      matcher.clearCache();

      // Should work after cache clear
      expect(matcher.matches('API_KEY', patterns)).toBe(true);
    });

    it('should handle empty patterns', () => {
      expect(matcher.matches('API_KEY', [])).toBe(false);
    });

    it('should handle multiple different patterns', () => {
      const patterns1 = ['*KEY*'];
      const patterns2 = ['*TOKEN*'];

      expect(matcher.matches('API_KEY', patterns1)).toBe(true);
      expect(matcher.matches('ACCESS_TOKEN', patterns2)).toBe(true);
      expect(matcher.matches('NODE_ENV', patterns1)).toBe(false);
    });
  });

  describe('real-world scenarios', () => {
    const defaultPatterns = [
      '*KEY*',
      '*TOKEN*',
      '*SECRET*',
      '*PASSWORD*',
      '*PWD*',
      '*DB*',
      '*DATABASE*',
      '*PORT*',
    ];

    it('should match common environment variables', () => {
      expect(matchesAnyPattern('API_KEY', defaultPatterns)).toBe(true);
      expect(matchesAnyPattern('DATABASE_URL', defaultPatterns)).toBe(true);
      expect(matchesAnyPattern('JWT_SECRET', defaultPatterns)).toBe(true);
      expect(matchesAnyPattern('PASSWORD', defaultPatterns)).toBe(true);
      expect(matchesAnyPattern('DB_HOST', defaultPatterns)).toBe(true);
      expect(matchesAnyPattern('ACCESS_TOKEN', defaultPatterns)).toBe(true);
    });

    it('should not match non-sensitive variables', () => {
      expect(matchesAnyPattern('NODE_ENV', defaultPatterns)).toBe(false);
      expect(matchesAnyPattern('PUBLIC_URL', defaultPatterns)).toBe(false);
      expect(matchesAnyPattern('DEBUG_MODE', defaultPatterns)).toBe(false);
      expect(matchesAnyPattern('BUILD_VERSION', defaultPatterns)).toBe(false);
    });

    it('should handle edge cases with partial matches', () => {
      expect(matchesAnyPattern('KEYCHAIN', defaultPatterns)).toBe(true); // contains KEY
      expect(matchesAnyPattern('KEYBOARD', defaultPatterns)).toBe(true); // contains KEY
      expect(matchesAnyPattern('PORT_EXPOSED', defaultPatterns)).toBe(true); // starts with PORT
      expect(matchesAnyPattern('EXPORT_DB', defaultPatterns)).toBe(true); // ends with DB
    });
  });
});
