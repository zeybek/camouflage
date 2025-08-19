import { describe, expect, it, jest } from '@jest/globals';
import {
  findAllEnvVariables,
  findCommentedEnvVariables,
  findEnvVariables,
  isEnvFile,
} from '../file';

// Mock VS Code API
jest.mock(
  'vscode',
  () => ({
    workspace: {
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
    },
  }),
  { virtual: true }
);

// Get the mock after it's created
import * as vscode from 'vscode';
const mockGet = (vscode.workspace.getConfiguration() as any).get;

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

    it('should find PHP define() statements', () => {
      const text = `define('API_KEY', 'secret123');
define("DB_PASSWORD", "password456");
define('STRIPE_SECRET', 'sk_test_123');`;
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(3);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[0][2]).toBe('secret123');
      expect(matches[1][1]).toBe('DB_PASSWORD');
      expect(matches[1][2]).toBe('password456');
      expect(matches[2][1]).toBe('STRIPE_SECRET');
      expect(matches[2][2]).toBe('sk_test_123');
    });

    it('should find PHP array syntax', () => {
      const text = `'api_key' => 'secret123',
"db_password" => "password456",
'smtp_user' => 'user@example.com'`;
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(3);
      expect(matches[0][1]).toBe('api_key');
      expect(matches[0][2]).toBe('secret123');
      expect(matches[1][1]).toBe('db_password');
      expect(matches[1][2]).toBe('password456');
    });

    it('should find YAML/JSON format', () => {
      const text = `api_key: "secret123"
"db_password": "password456"
smtp_user: 'user@example.com'`;
      const matches = findEnvVariables(text);

      expect(matches).toHaveLength(3);
      expect(matches[0][1]).toBe('api_key');
      expect(matches[0][2]).toBe('secret123');
      expect(matches[1][1]).toBe('db_password');
      expect(matches[1][2]).toBe('password456');
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
    it('should identify files matching default patterns', () => {
      // Mock default configuration
      mockGet.mockReturnValue(['.env*', '*.env']);

      expect(isEnvFile('.env')).toBe(true);
      expect(isEnvFile('path/to/.env')).toBe(true);
      expect(isEnvFile('.env.local')).toBe(true);
      expect(isEnvFile('.env.development')).toBe(true);
      expect(isEnvFile('development.env')).toBe(true);
      expect(isEnvFile('/full/path/to/production.env')).toBe(true);
    });

    it('should identify files matching custom patterns', () => {
      // Mock custom configuration
      mockGet.mockReturnValue(['config.*', '*.conf', 'settings*']);

      expect(isEnvFile('config.json')).toBe(true);
      expect(isEnvFile('config.yaml')).toBe(true);
      expect(isEnvFile('database.conf')).toBe(true);
      expect(isEnvFile('settings.ini')).toBe(true);
      expect(isEnvFile('settings')).toBe(true);
      expect(isEnvFile('/path/to/config.properties')).toBe(true);
    });

    it('should identify PHP configuration files', () => {
      // Mock PHP configuration patterns
      mockGet.mockReturnValue(['*.php', '*config*.php', 'database.php', '*.env']);

      expect(isEnvFile('test-config.php')).toBe(true);
      expect(isEnvFile('config.php')).toBe(true);
      expect(isEnvFile('database-config.php')).toBe(true);
      expect(isEnvFile('app-config-prod.php')).toBe(true);
      expect(isEnvFile('settings.php')).toBe(true);
      expect(isEnvFile('/full/path/to/secrets.php')).toBe(true);
      expect(isEnvFile('.env')).toBe(true);

      // Should not match non-PHP files when only PHP patterns are configured
      expect(isEnvFile('script.js')).toBe(false);
      expect(isEnvFile('style.css')).toBe(false);
      expect(isEnvFile('readme.txt')).toBe(false);
    });

    it('should reject files not matching patterns', () => {
      // Mock default configuration
      mockGet.mockReturnValue(['.env*', '*.env']);

      expect(isEnvFile('package.json')).toBe(false);
      expect(isEnvFile('README.md')).toBe(false);
      expect(isEnvFile('environment.txt')).toBe(false);
      expect(isEnvFile('config.json')).toBe(false);
    });

    it('should handle empty patterns', () => {
      // Mock empty configuration
      mockGet.mockReturnValue([]);

      expect(isEnvFile('.env')).toBe(false);
      expect(isEnvFile('config.json')).toBe(false);
    });
  });
});
