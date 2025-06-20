import { describe, expect, it } from '@jest/globals';
import {
  findAllEnvVariables,
  findCommentedEnvVariables,
  findEnvVariables,
  isEnvFile,
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

    it('should reject non-env files', () => {
      expect(isEnvFile('config.json')).toBe(false);
      expect(isEnvFile('package.json')).toBe(false);
      expect(isEnvFile('environment.txt')).toBe(false);
      expect(isEnvFile('README.md')).toBe(false);
    });
  });
});
