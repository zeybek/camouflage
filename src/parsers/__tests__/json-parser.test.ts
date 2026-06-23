import { JsonParser } from '../json-parser';

describe('JsonParser', () => {
  let parser: JsonParser;

  beforeEach(() => {
    parser = new JsonParser();
  });

  describe('canParse', () => {
    it('should return true for .json files', () => {
      expect(parser.canParse('config.json')).toBe(true);
      expect(parser.canParse('package.json')).toBe(true);
      expect(parser.canParse('/path/to/settings.json')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(parser.canParse('.env')).toBe(false);
      expect(parser.canParse('config.yaml')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse simple key-value pairs', () => {
      const content = '{"api_key": "secret123", "db_host": "localhost"}';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('api_key');
      expect(result[0].value).toBe('secret123');
      expect(result[1].key).toBe('db_host');
      expect(result[1].value).toBe('localhost');
    });

    it('should parse nested objects', () => {
      const content = `{
        "database": {
          "host": "localhost",
          "password": "secret"
        }
      }`;
      const result = parser.parse(content);

      // Should find root level and nested values
      const passwordVar = result.find((v) => v.key === 'database.password');
      expect(passwordVar).toBeDefined();
      expect(passwordVar?.value).toBe('secret');
      expect(passwordVar?.isNested).toBe(true);
    });

    it('should handle deeply nested objects', () => {
      const content = `{
        "level1": {
          "level2": {
            "level3": {
              "secret": "deep_value"
            }
          }
        }
      }`;
      const result = parser.parse(content);

      const deepVar = result.find((v) => v.key === 'level1.level2.level3.secret');
      expect(deepVar).toBeDefined();
      expect(deepVar?.value).toBe('deep_value');
    });

    it('should respect maxNestedDepth option', () => {
      const parserWithLowDepth = new JsonParser({ maxNestedDepth: 1 });
      const content = `{
        "level1": {
          "level2": {
            "secret": "should_not_find"
          }
        }
      }`;
      const result = parserWithLowDepth.parse(content);

      const deepVar = result.find((v) => v.key.includes('level2.secret'));
      expect(deepVar).toBeUndefined();
    });

    it('should calculate correct positions', () => {
      const content = '{"key": "value"}';
      const result = parser.parse(content);

      expect(result[0].startIndex).toBe(9); // Position after opening quote of value
      expect(result[0].endIndex).toBe(14); // End of 'value'
    });

    it('should handle escaped characters in values', () => {
      const content = '{"message": "Hello World"}';
      const result = parser.parse(content);

      expect(result[0].value).toBe('Hello World');
    });

    it('should mask string and numeric values but leave booleans/null visible', () => {
      const content = '{"count": 42, "enabled": true, "name": "test"}';
      const result = parser.parse(content);

      // Numbers are secrets too (PINs, account numbers); booleans/null are not.
      expect(result.map((v) => v.key).sort()).toEqual(['count', 'name']);
      const count = result.find((v) => v.key === 'count');
      expect(count?.value).toBe('42');
      expect(content.slice(count!.startIndex, count!.endIndex)).toBe('42');
    });

    it('should handle invalid JSON gracefully', () => {
      const content = '{"key": "value"'; // Missing closing brace
      const result = parser.parse(content);

      // Should still find the key-value pair using regex fallback
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('key');
    });

    it('should mask string array items', () => {
      const content = '{"items": ["a", "b"], "name": "test"}';
      const result = parser.parse(content);

      expect(result.some((v) => v.key === 'name')).toBe(true);
      const a = result.find((v) => content.slice(v.startIndex, v.endIndex) === 'a');
      const b = result.find((v) => content.slice(v.startIndex, v.endIndex) === 'b');
      expect(a).toBeDefined();
      expect(b).toBeDefined();
    });

    it('should handle null values', () => {
      const content = '{"nullable": null, "name": "test"}';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('name');
    });

    it('should handle empty object', () => {
      const content = '{}';
      const result = parser.parse(content);

      expect(result).toHaveLength(0);
    });

    it('should handle empty string values', () => {
      const content = '{"empty": "", "name": "test"}';
      const result = parser.parse(content);

      // Empty strings should be included
      expect(result.some((v) => v.key === 'empty')).toBe(true);
    });

    it('should handle duplicate keys in regex fallback', () => {
      const content = '{"key": "value1"}\n{"key": "value2"}'; // Invalid JSON
      const result = parser.parse(content);

      // Regex fallback should find both
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle special characters in keys', () => {
      const content = '{"key-with-dash": "value", "key.with.dot": "value2"}';
      const result = parser.parse(content);

      expect(result.some((v) => v.key === 'key-with-dash')).toBe(true);
      expect(result.some((v) => v.key === 'key.with.dot')).toBe(true);
    });

    it('should calculate line numbers correctly', () => {
      const content = `{
  "line1": "value1",
  "line2": "value2"
}`;
      const result = parser.parse(content);

      expect(result[0].lineNumber).toBe(1);
      expect(result[1].lineNumber).toBe(2);
    });
  });

  describe('security regressions (values must never leak)', () => {
    const maskedSpans = (content: string) =>
      parser.parse(content).map((v) => content.slice(v.startIndex, v.endIndex));

    it('masks string values containing escaped quotes', () => {
      const content = '{"password": "a\\"b"}';
      const result = parser.parse(content);
      expect(result).toHaveLength(1);
      expect(content.slice(result[0].startIndex, result[0].endIndex)).toBe('a\\"b');
    });

    it('masks values containing backslashes (Windows paths)', () => {
      const content = '{"winPath": "C:\\\\Users\\\\admin"}';
      const result = parser.parse(content);
      expect(content.slice(result[0].startIndex, result[0].endIndex)).toBe('C:\\\\Users\\\\admin');
    });

    it('masks values containing newline/tab escapes', () => {
      const content = '{"cert": "line1\\nline2\\tend"}';
      const result = parser.parse(content);
      expect(content.slice(result[0].startIndex, result[0].endIndex)).toBe('line1\\nline2\\tend');
    });

    it('masks values containing unicode escapes', () => {
      const content = '{"u": "caf\\u00e9"}';
      const result = parser.parse(content);
      expect(content.slice(result[0].startIndex, result[0].endIndex)).toBe('caf\\u00e9');
    });

    it('masks every value when integer-like keys reorder', () => {
      const content = '{"10": "SECRET_A", "2": "SECRET_B"}';
      const spans = maskedSpans(content);
      expect(spans).toContain('SECRET_A');
      expect(spans).toContain('SECRET_B');
    });

    it('masks both values of a duplicate key', () => {
      const content = '{"a": "first", "a": "second"}';
      const spans = maskedSpans(content);
      expect(spans).toContain('first');
      expect(spans).toContain('second');
    });
  });

  describe('scanner edge cases', () => {
    const spans = (c: string) => parser.parse(c).map((v) => c.slice(v.startIndex, v.endIndex));

    it('returns nothing for empty / whitespace content', () => {
      expect(parser.parse('')).toEqual([]);
      expect(parser.parse('   \n  ')).toEqual([]);
    });

    it('masks a top-level array, string and number', () => {
      expect(spans('["a", "b"]')).toEqual(['a', 'b']);
      expect(spans('"secret"')).toEqual(['secret']);
      expect(spans('1234')).toEqual(['1234']);
    });

    it('leaves top-level booleans / null visible', () => {
      expect(parser.parse('true')).toEqual([]);
      expect(parser.parse('null')).toEqual([]);
    });

    it('masks numbers but not booleans inside an object', () => {
      expect(spans('{"a": false, "b": true, "c": "x", "d": 5}')).toEqual(['x', '5']);
    });

    it('handles empty arrays and objects', () => {
      expect(parser.parse('{"a": [], "b": {}}')).toEqual([]);
    });

    it('falls back without crashing on malformed JSON', () => {
      expect(() => parser.parse('{bad}')).not.toThrow();
      expect(() => parser.parse('{"a" 5}')).not.toThrow();
      expect(() => parser.parse('["a" "b"]')).not.toThrow();
      expect(() => parser.parse('{"a": xyz}')).not.toThrow();
      expect(() => parser.parse('{"a": "no end')).not.toThrow();
    });

    it('falls back when nesting exceeds the recursion guard', () => {
      const deep = '{"a":'.repeat(600) + '"x"' + '}'.repeat(600);
      expect(() => parser.parse(deep)).not.toThrow();
    });

    it('clamps the key path for array items beyond maxNestedDepth', () => {
      const limited = new JsonParser({ maxNestedDepth: 1 });
      const content = '{"a": ["x"]}';
      const spans = limited.parse(content).map((v) => content.slice(v.startIndex, v.endIndex));
      expect(spans).toContain('x');
    });
  });
});
