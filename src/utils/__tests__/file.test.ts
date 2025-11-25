import { describe, expect, it } from '@jest/globals';
import {
  findAllEnvVariables,
  findCommentedEnvVariables,
  findEnvVariables,
  getSupportedExtensions,
  isEnvFile,
  isSupportedFile,
  parseFileContent,
} from '../file';

describe('file utils', () => {
  describe('findEnvVariables', () => {
    it('should find simple environment variables', () => {
      const text = 'API_KEY=secret123\nDB_HOST=localhost';
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[0][2]).toBe('secret123');
      expect(matches[1][1]).toBe('DB_HOST');
      expect(matches[1][2]).toBe('localhost');
    });

    it('should find environment variables with export', () => {
      const text = 'export API_KEY=secret123\nexport DB_HOST=localhost';
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[0][2]).toBe('secret123');
    });

    it('should handle quoted values', () => {
      const text = 'API_KEY="secret123"\nDB_HOST=\'localhost\'';
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][2]).toBe('"secret123"');
      expect(matches[1][2]).toBe("'localhost'");
    });

    it('should handle values with spaces', () => {
      const text = 'API_KEY=secret with spaces\nDB_HOST=localhost';
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][2]).toBe('secret with spaces');
    });

    it('should ignore commented lines', () => {
      const text = 'API_KEY=secret123\n# DB_HOST=localhost\nPORT=3000';
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[1][1]).toBe('PORT');
    });
  });

  describe('findCommentedEnvVariables', () => {
    it('should find commented environment variables', () => {
      const text = '# API_KEY=secret123\n# DB_HOST=localhost\nPORT=3000';
      const matches = findCommentedEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[0][2]).toBe('secret123');
      expect(matches[1][1]).toBe('DB_HOST');
      expect(matches[1][2]).toBe('localhost');
    });

    it('should find commented environment variables with export', () => {
      const text = '# export API_KEY=secret123\n# export DB_HOST=localhost';
      const matches = findCommentedEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[0][2]).toBe('secret123');
    });

    it('should handle commented lines with spaces after hash', () => {
      const text = '#   API_KEY=secret123\n#  DB_HOST=localhost';
      const matches = findCommentedEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[0][2]).toBe('secret123');
    });

    it('should handle quoted values in comments', () => {
      const text = '# API_KEY="secret123"\n# DB_HOST=\'localhost\'';
      const matches = findCommentedEnvVariables(text);

      expect(matches).toHaveLength(2);
      expect(matches[0][2]).toBe('"secret123"');
      expect(matches[1][2]).toBe("'localhost'");
    });

    it('should ignore uncommented lines', () => {
      const text = 'API_KEY=secret123\n# DB_HOST=localhost\nPORT=3000';
      const matches = findCommentedEnvVariables(text);

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('DB_HOST');
    });
  });

  describe('findAllEnvVariables', () => {
    it('should find both regular and commented environment variables', () => {
      const text = `
API_KEY=secret123
# DB_HOST=localhost
PORT=3000
# PASSWORD="sensitive"
export ANOTHER_KEY=value
# export COMMENTED_EXPORT=test
`;
      const result = findAllEnvVariables(text);

      expect(result.regular).toHaveLength(3);
      expect(result.commented).toHaveLength(3);

      // Check regular variables
      expect(result.regular[0][1]).toBe('API_KEY');
      expect(result.regular[1][1]).toBe('PORT');
      expect(result.regular[2][1]).toBe('ANOTHER_KEY');

      // Check commented variables
      expect(result.commented[0][1]).toBe('DB_HOST');
      expect(result.commented[1][1]).toBe('PASSWORD');
      expect(result.commented[2][1]).toBe('COMMENTED_EXPORT');
    });

    it('should handle empty text', () => {
      const result = findAllEnvVariables('');

      expect(result.regular).toHaveLength(0);
      expect(result.commented).toHaveLength(0);
    });
  });

  describe('isEnvFile', () => {
    it('should identify .env files', () => {
      expect(isEnvFile('.env')).toBe(true);
      expect(isEnvFile('path/to/.env')).toBe(true);
      expect(isEnvFile('.env.local')).toBe(true);
      expect(isEnvFile('.env.development')).toBe(true);
      expect(isEnvFile('development.env')).toBe(true);
      expect(isEnvFile('.envrc')).toBe(true);
    });

    it('should identify supported config files (multi-format support)', () => {
      // JSON files are now supported
      expect(isEnvFile('config.json')).toBe(true);
      expect(isEnvFile('settings.yaml')).toBe(true);
      expect(isEnvFile('app.properties')).toBe(true);
      expect(isEnvFile('config.toml')).toBe(true);
      expect(isEnvFile('script.sh')).toBe(true);
    });

    it('should reject unsupported files', () => {
      expect(isEnvFile('environment.txt')).toBe(false);
      expect(isEnvFile('README.md')).toBe(false);
      expect(isEnvFile('style.css')).toBe(false);
      expect(isEnvFile('app.js')).toBe(false);
    });
  });

  describe('isSupportedFile', () => {
    it('should return true for env files', () => {
      expect(isSupportedFile('.env')).toBe(true);
      expect(isSupportedFile('.env.local')).toBe(true);
      expect(isSupportedFile('.envrc')).toBe(true);
    });

    it('should return true for json files', () => {
      expect(isSupportedFile('config.json')).toBe(true);
      expect(isSupportedFile('/path/to/settings.json')).toBe(true);
    });

    it('should return true for yaml files', () => {
      expect(isSupportedFile('config.yaml')).toBe(true);
      expect(isSupportedFile('config.yml')).toBe(true);
    });

    it('should return true for properties files', () => {
      expect(isSupportedFile('app.properties')).toBe(true);
      expect(isSupportedFile('settings.ini')).toBe(true);
      expect(isSupportedFile('app.conf')).toBe(true);
    });

    it('should return true for toml files', () => {
      expect(isSupportedFile('config.toml')).toBe(true);
    });

    it('should return true for shell scripts', () => {
      expect(isSupportedFile('script.sh')).toBe(true);
      expect(isSupportedFile('/path/to/deploy.sh')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      expect(isSupportedFile('README.md')).toBe(false);
      expect(isSupportedFile('app.ts')).toBe(false);
      expect(isSupportedFile('style.css')).toBe(false);
      expect(isSupportedFile('index.html')).toBe(false);
    });
  });

  describe('parseFileContent', () => {
    it('should parse env file content', () => {
      const content = 'API_KEY=secret123\nDB_HOST=localhost';
      const result = parseFileContent('.env', content);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].key).toBe('API_KEY');
      expect(result[0].value).toBe('secret123');
    });

    it('should parse json file content', () => {
      const content = '{"apiKey": "secret123", "dbHost": "localhost"}';
      const result = parseFileContent('config.json', content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((v) => v.key === 'apiKey')).toBe(true);
    });

    it('should parse yaml file content', () => {
      const content = 'apiKey: secret123\ndbHost: localhost';
      const result = parseFileContent('config.yaml', content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should parse properties file content', () => {
      const content = 'api.key=secret123\ndb.host=localhost';
      const result = parseFileContent('app.properties', content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should parse toml file content', () => {
      const content = '[database]\nhost = "localhost"\npassword = "secret"';
      const result = parseFileContent('config.toml', content);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should parse shell script content', () => {
      const content = 'export API_KEY=secret123\nexport DB_HOST=localhost';
      const result = parseFileContent('script.sh', content);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].key).toBe('API_KEY');
    });

    it('should return empty array for unsupported files', () => {
      const content = 'some random content';
      const result = parseFileContent('README.md', content);

      expect(result).toEqual([]);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return all supported extensions', () => {
      const extensions = getSupportedExtensions();

      expect(extensions).toContain('.env');
      expect(extensions).toContain('.json');
      expect(extensions).toContain('.yaml');
      expect(extensions).toContain('.yml');
      expect(extensions).toContain('.properties');
      expect(extensions).toContain('.toml');
      expect(extensions).toContain('.sh');
    });

    it('should return an array', () => {
      const extensions = getSupportedExtensions();
      expect(Array.isArray(extensions)).toBe(true);
    });
  });

  describe('isEnvFile (legacy)', () => {
    it('should return true for legacy .env patterns', () => {
      expect(isEnvFile('.env')).toBe(true);
      expect(isEnvFile('.env.local')).toBe(true);
      expect(isEnvFile('path/to/.envrc')).toBe(true);
    });

    it('should handle case insensitivity', () => {
      expect(isEnvFile('.ENV')).toBe(true);
      expect(isEnvFile('.ENV.LOCAL')).toBe(true);
    });
  });

  describe('isSupportedFile with exclusions', () => {
    // Note: This test requires mocking config.isFileExcluded
    // In the actual implementation, excluded files return false
    it('should return true for supported files', () => {
      expect(isSupportedFile('config.json')).toBe(true);
      expect(isSupportedFile('.env')).toBe(true);
    });

    it('should handle user-defined patterns', () => {
      // Default patterns include *.json, *.yaml, etc.
      expect(isSupportedFile('myconfig.json')).toBe(true);
      expect(isSupportedFile('settings.yaml')).toBe(true);
    });
  });
});
