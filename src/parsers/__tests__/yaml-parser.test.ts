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

    it('should handle empty values', () => {
      const content = 'key:\nother: value';
      const result = parser.parse(content);

      // Empty values (parent nodes) are skipped
      expect(result.some((v) => v.key === 'other')).toBe(true);
    });

    it('should skip parent nodes with nested depth > 0', () => {
      const content = `parent:
  child: value`;
      const result = parser.parse(content);

      // Only the leaf node should be parsed
      const childVar = result.find((v) => v.key === 'parent.child');
      expect(childVar).toBeDefined();
    });

    it('should handle tabs for indentation', () => {
      const content = 'parent:\n\tchild: value';
      const result = parser.parse(content);

      expect(result.some((v) => v.key.includes('child'))).toBe(true);
    });

    it('should handle mixed indentation', () => {
      const content = `parent:
  child1: value1
    grandchild: value2`;
      const result = parser.parse(content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should skip comment lines', () => {
      const content = `# This is a comment
key: value`;
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('key');
    });

    it('should handle empty content', () => {
      const result = parser.parse('');
      expect(result).toHaveLength(0);
    });

    it('should handle only document separators', () => {
      const content = '---\n...';
      const result = parser.parse(content);

      expect(result).toHaveLength(0);
    });

    it('should handle inline comments after values', () => {
      const content = 'key: value # this is a comment';
      const result = parser.parse(content);

      expect(result[0].value).toBe('value # this is a comment');
    });

    it('should respect maxNestedDepth option', () => {
      const content = `l1:
  l2:
    l3:
      l4: deep`;
      const limitedParser = new YamlParser({ maxNestedDepth: 2 });
      const result = limitedParser.parse(content);

      // Should not parse beyond depth 2 (l1=depth1, l1.l2=depth2, l1.l2.l3=depth3, l1.l2.l3.l4=depth4)
      const deepVar = result.find((v) => v.key === 'l1.l2.l3.l4');
      expect(deepVar).toBeUndefined();

      // l1.l2 is at depth 2, so it should be parsed but it has no value (it's a parent)
      // Only leaf nodes with values are returned
    });

    it('should handle empty lines between entries', () => {
      const content = `key1: value1

key2: value2`;
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
    });

    it('should handle complex nested structure', () => {
      const content = `database:
  primary:
    host: localhost
    port: 5432
  replica:
    host: replica.local`;
      const result = parser.parse(content);

      expect(result.some((v) => v.key === 'database.primary.host')).toBe(true);
      expect(result.some((v) => v.key === 'database.replica.host')).toBe(true);
    });
  });
});
