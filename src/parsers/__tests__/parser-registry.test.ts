import {
  ParserRegistry,
  getParserRegistry,
  resetParserRegistry,
  isSupportedFile,
  parseFile,
  configureParserRegistry,
  matchesUserPatterns,
} from '../index';

describe('ParserRegistry', () => {
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
  });

  describe('constructor', () => {
    it('should initialize with all parsers by default', () => {
      const parsers = registry.getEnabledParsers();
      expect(parsers).toHaveLength(5);
    });

    it('should allow specifying enabled parsers', () => {
      const limitedRegistry = new ParserRegistry(['env', 'json']);
      const parsers = limitedRegistry.getEnabledParsers();
      expect(parsers).toHaveLength(2);
    });
  });

  describe('setEnabledParsers', () => {
    it('should update enabled parsers', () => {
      registry.setEnabledParsers(['env']);
      const parsers = registry.getEnabledParsers();
      expect(parsers).toHaveLength(1);
      expect(parsers[0].name).toBe('env');
    });
  });

  describe('findParserForFile', () => {
    it('should find env parser for .env files', () => {
      const parser = registry.findParserForFile('.env');
      expect(parser?.name).toBe('env');
    });

    it('should find json parser for .json files', () => {
      const parser = registry.findParserForFile('config.json');
      expect(parser?.name).toBe('json');
    });

    it('should find yaml parser for .yaml files', () => {
      const parser = registry.findParserForFile('config.yaml');
      expect(parser?.name).toBe('yaml');
    });

    it('should find yaml parser for .yml files', () => {
      const parser = registry.findParserForFile('config.yml');
      expect(parser?.name).toBe('yaml');
    });

    it('should find properties parser for .properties files', () => {
      const parser = registry.findParserForFile('app.properties');
      expect(parser?.name).toBe('properties');
    });

    it('should find toml parser for .toml files', () => {
      const parser = registry.findParserForFile('config.toml');
      expect(parser?.name).toBe('toml');
    });

    it('should return undefined for unsupported files', () => {
      const parser = registry.findParserForFile('style.css');
      expect(parser).toBeUndefined();
    });

    it('should respect enabled parsers', () => {
      registry.setEnabledParsers(['env']);
      const parser = registry.findParserForFile('config.json');
      expect(parser).toBeUndefined();
    });
  });

  describe('canParseFile', () => {
    it('should return true for supported files', () => {
      expect(registry.canParseFile('.env')).toBe(true);
      expect(registry.canParseFile('config.json')).toBe(true);
      expect(registry.canParseFile('config.yaml')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      expect(registry.canParseFile('style.css')).toBe(false);
      expect(registry.canParseFile('script.js')).toBe(false);
    });
  });

  describe('parseFile', () => {
    it('should parse .env content', () => {
      const result = registry.parseFile('.env', 'API_KEY=secret');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('API_KEY');
    });

    it('should parse JSON content', () => {
      const result = registry.parseFile('config.json', '{"api_key": "secret"}');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('api_key');
    });

    it('should return empty array for unsupported files', () => {
      const result = registry.parseFile('style.css', '.class { color: red; }');
      expect(result).toHaveLength(0);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return all supported extensions', () => {
      const extensions = registry.getSupportedExtensions();
      expect(extensions).toContain('.env');
      expect(extensions).toContain('.json');
      expect(extensions).toContain('.yaml');
      expect(extensions).toContain('.yml');
      expect(extensions).toContain('.properties');
      expect(extensions).toContain('.toml');
    });

    it('should return only enabled parser extensions', () => {
      registry.setEnabledParsers(['env']);
      const extensions = registry.getSupportedExtensions();

      expect(extensions).toContain('.env');
      expect(extensions).not.toContain('.json');
    });
  });

  describe('updateParserOptions', () => {
    it('should update parser options', () => {
      registry.updateParserOptions('json', { maxNestedDepth: 5 });
      // Parser should still work after options update
      const result = registry.parseFile('test.json', '{"key": "value"}');
      expect(result).toHaveLength(1);
    });

    it('should handle non-existent parser type', () => {
      // Should not throw
      expect(() => {
        registry.updateParserOptions('invalid' as any, { maxNestedDepth: 5 });
      }).not.toThrow();
    });
  });

  describe('getParser', () => {
    it('should return parser by type', () => {
      const envParser = registry.getParser('env');
      expect(envParser).toBeDefined();
      expect(envParser?.name).toBe('env');
    });

    it('should return undefined for invalid type', () => {
      const parser = registry.getParser('invalid' as any);
      expect(parser).toBeUndefined();
    });
  });

  describe('setEnabledParsers', () => {
    it('should ignore invalid parser types', () => {
      registry.setEnabledParsers(['env', 'invalid' as any, 'json']);
      const parsers = registry.getEnabledParsers();

      // Should only have valid parsers
      expect(parsers).toHaveLength(2);
      expect(parsers.some((p) => p.name === 'env')).toBe(true);
      expect(parsers.some((p) => p.name === 'json')).toBe(true);
    });
  });
});

describe('Module exports', () => {
  beforeEach(() => {
    resetParserRegistry();
  });

  describe('getParserRegistry', () => {
    it('should return singleton instance', () => {
      const registry1 = getParserRegistry();
      const registry2 = getParserRegistry();
      expect(registry1).toBe(registry2);
    });
  });

  describe('resetParserRegistry', () => {
    it('should create new instance after reset', () => {
      const registry1 = getParserRegistry();
      resetParserRegistry();
      const registry2 = getParserRegistry();
      expect(registry1).not.toBe(registry2);
    });
  });

  describe('isSupportedFile', () => {
    it('should check file support using default registry', () => {
      expect(isSupportedFile('.env')).toBe(true);
      expect(isSupportedFile('config.json')).toBe(true);
      expect(isSupportedFile('style.css')).toBe(false);
    });
  });

  describe('parseFile', () => {
    it('should parse files using default registry', () => {
      const result = parseFile('.env', 'API_KEY=secret');
      expect(result).toHaveLength(1);
    });
  });

  describe('configureParserRegistry', () => {
    it('should configure enabled parsers', () => {
      configureParserRegistry(['env']);
      const registry = getParserRegistry();
      expect(registry.getEnabledParsers()).toHaveLength(1);
    });

    it('should configure parser options', () => {
      configureParserRegistry(['json'], {
        json: { maxNestedDepth: 5 },
      });
      // The parser should now have maxNestedDepth of 5
      const registry = getParserRegistry();
      const parser = registry.getParser('json');
      expect(parser).toBeDefined();
    });

    it('should configure yaml parser options', () => {
      configureParserRegistry(['yaml'], {
        yaml: { maxNestedDepth: 3 },
      });
      const registry = getParserRegistry();
      const parser = registry.getParser('yaml');
      expect(parser).toBeDefined();
    });
  });

  describe('matchesUserPatterns', () => {
    it('should match *pattern* (contains)', () => {
      expect(matchesUserPatterns('myconfig.env', ['*env*'])).toBe(true);
      expect(matchesUserPatterns('environment', ['*env*'])).toBe(true);
      expect(matchesUserPatterns('config.json', ['*env*'])).toBe(false);
    });

    it('should match *.ext (ends with)', () => {
      expect(matchesUserPatterns('config.json', ['*.json'])).toBe(true);
      expect(matchesUserPatterns('script.sh', ['*.sh'])).toBe(true);
      expect(matchesUserPatterns('config.yaml', ['*.json'])).toBe(false);
    });

    it('should match .pattern* (starts with dot)', () => {
      expect(matchesUserPatterns('.env', ['.env*'])).toBe(true);
      expect(matchesUserPatterns('.env.local', ['.env*'])).toBe(true);
      expect(matchesUserPatterns('.env.production', ['.env*'])).toBe(true);
      expect(matchesUserPatterns('env.local', ['.env*'])).toBe(false);
    });

    it('should match pattern* (starts with)', () => {
      expect(matchesUserPatterns('config.json', ['config*'])).toBe(true);
      expect(matchesUserPatterns('configuration.yaml', ['config*'])).toBe(true);
      expect(matchesUserPatterns('myconfig.json', ['config*'])).toBe(false);
    });

    it('should match exact pattern', () => {
      expect(matchesUserPatterns('.env', ['.env'])).toBe(true);
      expect(matchesUserPatterns('config.json', ['config.json'])).toBe(true);
      expect(matchesUserPatterns('.env.local', ['.env'])).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(matchesUserPatterns('CONFIG.JSON', ['*.json'])).toBe(true);
      expect(matchesUserPatterns('.ENV', ['.env*'])).toBe(true);
    });

    it('should return false for empty patterns', () => {
      expect(matchesUserPatterns('config.json', [])).toBe(false);
    });

    it('should handle full paths', () => {
      expect(matchesUserPatterns('/path/to/config.json', ['*.json'])).toBe(true);
      expect(matchesUserPatterns('/path/to/.env.local', ['.env*'])).toBe(true);
    });
  });
});
