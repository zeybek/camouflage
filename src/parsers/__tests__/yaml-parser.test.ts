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

  describe('security regressions (multi-line / lists must not leak)', () => {
    const spans = (content: string) =>
      parser.parse(content).map((v) => content.slice(v.startIndex, v.endIndex));

    it('masks the full body of a literal block scalar (|)', () => {
      const content = 'config:\n  key: |\n    -----BEGIN-----\n    SECRET_BODY\n    -----END-----';
      const masked = spans(content).join('\n');
      expect(masked).toContain('SECRET_BODY');
      expect(masked).toContain('-----BEGIN-----');
    });

    it('masks the full body of a folded block scalar (>)', () => {
      const content = 'note: >\n  secret_a\n  secret_b';
      const masked = spans(content).join('\n');
      expect(masked).toContain('secret_a');
      expect(masked).toContain('secret_b');
    });

    it('masks scalar list items', () => {
      const content = 'tokens:\n  - sk-aaa\n  - sk-bbb';
      const masked = spans(content);
      expect(masked).toContain('sk-aaa');
      expect(masked).toContain('sk-bbb');
    });

    it('masks values of mapping list items', () => {
      const content = 'users:\n  - name: admin\n    password: topsecret';
      const masked = spans(content);
      expect(masked).toContain('admin');
      expect(masked).toContain('topsecret');
    });

    it('stops a block scalar at a dedented sibling key', () => {
      const content = 'cert: |\n  LINE_A\n  LINE_B\n\nother: keepme';
      const result = parser.parse(content);
      const other = result.find((v) => v.key === 'other');
      expect(other).toBeDefined();
      expect(content.slice(other!.startIndex, other!.endIndex)).toBe('keepme');
    });

    it('keeps every masked span aligned to its source text', () => {
      const content = 'a:\n  b: |\n    x1\n    x2\n  c: plain';
      for (const v of parser.parse(content)) {
        expect(content.slice(v.startIndex, v.endIndex)).toBe(v.value);
      }
    });
  });

  describe('edge cases', () => {
    it('handles an empty block scalar without crashing', () => {
      expect(() => parser.parse('key: |')).not.toThrow();
      const result = parser.parse('key: |\nother: v');
      expect(result.some((v) => v.key === 'other')).toBe(true);
    });

    it('strips quotes from a quoted list item', () => {
      const content = 'items:\n  - "quoted_secret"';
      const spans = parser.parse(content).map((v) => content.slice(v.startIndex, v.endIndex));
      expect(spans).toContain('quoted_secret');
    });

    it('ignores an empty quoted or valueless list item', () => {
      expect(() => parser.parse('items:\n  - ""')).not.toThrow();
      expect(() => parser.parse('items:\n  - ')).not.toThrow();
    });

    it('ignores a dash-prefixed non-list line', () => {
      const result = parser.parse('a: 1\n-notalist');
      expect(result.some((v) => v.key === 'a')).toBe(true);
    });

    it('skips comment lines when includeCommented is false', () => {
      const result = new YamlParser({ includeCommented: false }).parse('# c\nkey: value');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('key');
    });

    it('handles a bare dash with no value', () => {
      expect(() => parser.parse('items:\n  -')).not.toThrow();
    });

    it('masks a root-level scalar list item', () => {
      const content = '- rootsecret';
      const spans = parser.parse(content).map((v) => content.slice(v.startIndex, v.endIndex));
      expect(spans).toContain('rootsecret');
    });

    it('masks a root-level mapping list item', () => {
      const content = '- name: rootadmin';
      const spans = parser.parse(content).map((v) => content.slice(v.startIndex, v.endIndex));
      expect(spans).toContain('rootadmin');
    });

    it('handles a mapping list item with an empty quoted value', () => {
      expect(() => parser.parse('items:\n  - name: ""')).not.toThrow();
    });

    it('handles a mapping list item with a whitespace-only value', () => {
      expect(() => parser.parse('items:\n  - name:   ')).not.toThrow();
    });

    it('strips single quotes from a list item', () => {
      const content = "items:\n  - 'singlesecret'";
      const spans = parser.parse(content).map((v) => content.slice(v.startIndex, v.endIndex));
      expect(spans).toContain('singlesecret');
    });
  });
});
