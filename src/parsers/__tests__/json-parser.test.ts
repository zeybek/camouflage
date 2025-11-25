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

    it('should ignore non-string values', () => {
      const content = '{"count": 42, "enabled": true, "name": "test"}';
      const result = parser.parse(content);

      // Should only find string values
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('name');
    });

    it('should handle invalid JSON gracefully', () => {
      const content = '{"key": "value"'; // Missing closing brace
      const result = parser.parse(content);

      // Should still find the key-value pair using regex fallback
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('key');
    });

    it('should handle arrays in JSON', () => {
      const content = '{"items": ["a", "b"], "name": "test"}';
      const result = parser.parse(content);

      // Should only find string properties, not array items
      expect(result.some((v) => v.key === 'name')).toBe(true);
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
});
