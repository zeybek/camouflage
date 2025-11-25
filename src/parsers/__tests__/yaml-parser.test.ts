import { YamlParser } from '../yaml-parser';

describe('YamlParser', () => {
  let parser: YamlParser;

  beforeEach(() => {
    parser = new YamlParser();
  });

  describe('canParse', () => {
    it('should return true for .yaml files', () => {
      expect(parser.canParse('config.yaml')).toBe(true);
      expect(parser.canParse('/path/to/settings.yaml')).toBe(true);
    });

    it('should return true for .yml files', () => {
      expect(parser.canParse('config.yml')).toBe(true);
      expect(parser.canParse('docker-compose.yml')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(parser.canParse('.env')).toBe(false);
      expect(parser.canParse('config.json')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse simple key-value pairs', () => {
      const content = 'api_key: secret123\ndb_host: localhost';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('api_key');
      expect(result[0].value).toBe('secret123');
      expect(result[1].key).toBe('db_host');
      expect(result[1].value).toBe('localhost');
    });

    it('should parse nested objects using indentation', () => {
      const content = `database:
  host: localhost
  password: secret`;
      const result = parser.parse(content);

      const passwordVar = result.find((v) => v.key === 'database.password');
      expect(passwordVar).toBeDefined();
      expect(passwordVar?.value).toBe('secret');
      expect(passwordVar?.isNested).toBe(true);
    });

    it('should handle deeply nested structures', () => {
      const content = `level1:
  level2:
    level3:
      secret: deep_value`;
      const result = parser.parse(content);

      const deepVar = result.find((v) => v.key === 'level1.level2.level3.secret');
      expect(deepVar).toBeDefined();
      expect(deepVar?.value).toBe('deep_value');
    });

    it('should handle quoted strings', () => {
      const content = 'message: "Hello World"';
      const result = parser.parse(content);

      expect(result[0].value).toBe('Hello World');
    });

    it('should handle single-quoted strings', () => {
      const content = "message: 'Hello World'";
      const result = parser.parse(content);

      expect(result[0].value).toBe('Hello World');
    });

    it('should skip document separators', () => {
      const content = `---
api_key: secret
...`;
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('api_key');
    });

    it('should parse commented variables when includeCommented is true', () => {
      const content = `# api_key: secret
db_host: localhost`;
      const parserWithComments = new YamlParser({ includeCommented: true });
      const result = parserWithComments.parse(content);

      expect(result).toHaveLength(2);
      const commentedVar = result.find((v) => v.isCommented);
      expect(commentedVar).toBeDefined();
    });

    it('should handle values with colons', () => {
      const content = 'url: https://example.com:8080';
      const result = parser.parse(content);

      expect(result[0].value).toBe('https://example.com:8080');
    });

    it('should calculate correct line numbers', () => {
      const content = `first: value1
second: value2
third: value3`;
      const result = parser.parse(content);

      expect(result[0].lineNumber).toBe(0);
      expect(result[1].lineNumber).toBe(1);
      expect(result[2].lineNumber).toBe(2);
    });
  });
});
