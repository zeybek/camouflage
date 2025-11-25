import { EnvParser } from '../env-parser';

describe('EnvParser', () => {
  let parser: EnvParser;

  beforeEach(() => {
    parser = new EnvParser();
  });

  describe('canParse', () => {
    it('should return true for .env files', () => {
      expect(parser.canParse('.env')).toBe(true);
      expect(parser.canParse('/path/to/.env')).toBe(true);
    });

    it('should return true for .env.* files', () => {
      expect(parser.canParse('.env.local')).toBe(true);
      expect(parser.canParse('.env.development')).toBe(true);
      expect(parser.canParse('.env.production')).toBe(true);
    });

    it('should return true for *.env files', () => {
      expect(parser.canParse('config.env')).toBe(true);
      expect(parser.canParse('app.env')).toBe(true);
    });

    it('should return true for .envrc files', () => {
      expect(parser.canParse('.envrc')).toBe(true);
    });

    it('should return true for .sh files', () => {
      expect(parser.canParse('script.sh')).toBe(true);
      expect(parser.canParse('setup.sh')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(parser.canParse('config.json')).toBe(false);
      expect(parser.canParse('settings.yaml')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse simple KEY=value pairs', () => {
      const content = 'API_KEY=secret123\nDB_HOST=localhost';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('API_KEY');
      expect(result[0].value).toBe('secret123');
      expect(result[1].key).toBe('DB_HOST');
      expect(result[1].value).toBe('localhost');
    });

    it('should parse export statements', () => {
      const content = 'export API_KEY=secret123\nexport DB_HOST=localhost';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('API_KEY');
      expect(result[0].value).toBe('secret123');
    });

    it('should skip empty values', () => {
      const content = 'DB_HOST=localhost\nEMPTY_KEY=';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('DB_HOST');
      expect(result[0].value).toBe('localhost');
    });

    it('should parse commented variables when includeCommented is true', () => {
      const content = '# API_KEY=secret123\nDB_HOST=localhost';
      const parserWithComments = new EnvParser({ includeCommented: true });
      const result = parserWithComments.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('DB_HOST');
      expect(result[1].key).toBe('API_KEY');
      expect(result[1].isCommented).toBe(true);
    });

    it('should calculate correct positions', () => {
      const content = 'API_KEY=secret';
      const result = parser.parse(content);

      expect(result[0].startIndex).toBe(8); // Position after '='
      expect(result[0].endIndex).toBe(14); // End of 'secret'
      expect(result[0].lineNumber).toBe(0);
    });

    it('should handle values with special characters', () => {
      const content = 'URL=https://example.com?foo=bar&baz=qux';
      const result = parser.parse(content);

      expect(result[0].value).toBe('https://example.com?foo=bar&baz=qux');
    });

    it('should handle quoted values', () => {
      const content = 'MESSAGE="Hello World"';
      const result = parser.parse(content);

      expect(result[0].value).toBe('"Hello World"');
    });
  });
});
