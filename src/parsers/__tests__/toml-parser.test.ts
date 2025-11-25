import { TomlParser } from '../toml-parser';

describe('TomlParser', () => {
  let parser: TomlParser;

  beforeEach(() => {
    parser = new TomlParser();
  });

  describe('canParse', () => {
    it('should return true for .toml files', () => {
      expect(parser.canParse('config.toml')).toBe(true);
      expect(parser.canParse('Cargo.toml')).toBe(true);
      expect(parser.canParse('pyproject.toml')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(parser.canParse('.env')).toBe(false);
      expect(parser.canParse('config.json')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse simple key-value pairs', () => {
      const content = 'api_key = "secret123"\ndb_host = "localhost"';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('api_key');
      expect(result[0].value).toBe('secret123');
      expect(result[1].key).toBe('db_host');
      expect(result[1].value).toBe('localhost');
    });

    it('should parse single-quoted strings', () => {
      const content = "api_key = 'secret123'";
      const result = parser.parse(content);

      expect(result[0].value).toBe('secret123');
    });

    it('should handle sections', () => {
      const content = `[database]
host = "localhost"
password = "secret"

[api]
key = "api_secret"`;
      const result = parser.parse(content);

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('database.host');
      expect(result[1].key).toBe('database.password');
      expect(result[2].key).toBe('api.key');
    });

    it('should handle nested sections', () => {
      const content = `[database.connection]
host = "localhost"
password = "secret"`;
      const result = parser.parse(content);

      expect(result[0].key).toBe('database.connection.host');
      expect(result[1].key).toBe('database.connection.password');
    });

    it('should handle array of tables', () => {
      const content = `[[servers]]
host = "server1"

[[servers]]
host = "server2"`;
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('servers.host');
    });

    it('should skip comment lines', () => {
      const content = `# This is a comment
api_key = "secret"`;
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('api_key');
    });

    it('should handle inline comments', () => {
      const content = 'api_key = "secret" # This is an inline comment';
      const result = parser.parse(content);

      expect(result[0].value).toBe('secret');
    });

    it('should handle unquoted values', () => {
      const content = 'port = 8080\nenabled = true';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe('8080');
      expect(result[1].value).toBe('true');
    });

    it('should parse commented properties when includeCommented is true', () => {
      const content = `# api_key = "commented_secret"
db_host = "localhost"`;
      const parserWithComments = new TomlParser({ includeCommented: true });
      const result = parserWithComments.parse(content);

      const commentedVar = result.find((v) => v.isCommented);
      expect(commentedVar).toBeDefined();
    });

    it('should handle dotted keys', () => {
      const content = 'database.host = "localhost"';
      const result = parser.parse(content);

      expect(result[0].key).toBe('database.host');
      expect(result[0].isNested).toBe(true);
    });

    it('should calculate correct line numbers', () => {
      const content = `first = "value1"
second = "value2"
third = "value3"`;
      const result = parser.parse(content);

      expect(result[0].lineNumber).toBe(0);
      expect(result[1].lineNumber).toBe(1);
      expect(result[2].lineNumber).toBe(2);
    });

    it('should handle multi-line basic strings on single line', () => {
      // Note: TomlParser currently supports triple-quote syntax for strings containing quotes
      // but does not support strings that actually span multiple lines
      const content = 'description = """string with "quotes" inside"""';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('description');
      expect(result[0].value).toBe('string with "quotes" inside');
    });

    it('should handle multi-line literal strings on single line', () => {
      // Note: TomlParser currently supports triple-quote syntax for strings containing quotes
      // but does not support strings that actually span multiple lines
      const content = "description = '''string with 'quotes' inside'''";
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('description');
      expect(result[0].value).toBe("string with 'quotes' inside");
    });

    it('should handle quoted keys', () => {
      const content = '"key with spaces" = "value"';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('key with spaces');
      expect(result[0].value).toBe('value');
    });

    it('should handle single-quoted keys', () => {
      const content = "'another key' = 'value'";
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('another key');
    });

    it('should handle unquoted values with inline comments', () => {
      const content = 'port = 3000 # default port\nhost = localhost # server';
      const result = parser.parse(content);

      expect(result[0].value).toBe('3000');
      expect(result[1].value).toBe('localhost');
    });

    it('should skip empty lines', () => {
      const content = `key1 = "value1"

key2 = "value2"`;
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
    });

    it('should handle empty content', () => {
      const result = parser.parse('');
      expect(result).toHaveLength(0);
    });

    it('should handle only comments', () => {
      const content = '# This is a comment\n# Another comment';
      const result = parser.parse(content);

      expect(result).toHaveLength(0);
    });
  });
});
