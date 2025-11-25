import { PropertiesParser } from '../properties-parser';

describe('PropertiesParser', () => {
  let parser: PropertiesParser;

  beforeEach(() => {
    parser = new PropertiesParser();
  });

  describe('canParse', () => {
    it('should return true for .properties files', () => {
      expect(parser.canParse('config.properties')).toBe(true);
      expect(parser.canParse('application.properties')).toBe(true);
    });

    it('should return true for .ini files', () => {
      expect(parser.canParse('config.ini')).toBe(true);
      expect(parser.canParse('settings.ini')).toBe(true);
    });

    it('should return true for .conf files', () => {
      expect(parser.canParse('app.conf')).toBe(true);
      expect(parser.canParse('nginx.conf')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(parser.canParse('.env')).toBe(false);
      expect(parser.canParse('config.json')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse key=value pairs', () => {
      const content = 'api.key=secret123\ndb.host=localhost';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('api.key');
      expect(result[0].value).toBe('secret123');
      expect(result[1].key).toBe('db.host');
      expect(result[1].value).toBe('localhost');
    });

    it('should parse key: value pairs', () => {
      const content = 'api.key: secret123\ndb.host: localhost';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('api.key');
      expect(result[0].value).toBe('secret123');
    });

    it('should handle INI sections', () => {
      const content = `[database]
host=localhost
password=secret

[api]
key=api_secret`;
      const result = parser.parse(content);

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('database.host');
      expect(result[1].key).toBe('database.password');
      expect(result[2].key).toBe('api.key');
    });

    it('should skip comment lines starting with #', () => {
      const content = `# This is a comment
api.key=secret`;
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('api.key');
    });

    it('should skip comment lines starting with ;', () => {
      const content = `; This is a comment
api.key=secret`;
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
    });

    it('should parse commented properties when includeCommented is true', () => {
      const content = `# api.key=commented_secret
db.host=localhost`;
      const parserWithComments = new PropertiesParser({ includeCommented: true });
      const result = parserWithComments.parse(content);

      const commentedVar = result.find((v) => v.isCommented);
      expect(commentedVar).toBeDefined();
      expect(commentedVar?.value).toBe('commented_secret');
    });

    it('should handle spaces around = and :', () => {
      const content = 'api.key = secret\ndb.host : localhost';
      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe('secret');
      expect(result[1].value).toBe('localhost');
    });

    it('should skip empty values', () => {
      const content = 'api.key=\ndb.host=localhost';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('db.host');
    });

    it('should calculate correct line numbers', () => {
      const content = `first=value1
second=value2
third=value3`;
      const result = parser.parse(content);

      expect(result[0].lineNumber).toBe(0);
      expect(result[1].lineNumber).toBe(1);
      expect(result[2].lineNumber).toBe(2);
    });
  });
});
