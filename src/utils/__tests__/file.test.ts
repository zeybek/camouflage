import { describe, expect, it } from '@jest/globals';
import { findEnvVariables, isEnvFile } from '../file';

describe('file utils', () => {
  describe('isEnvFile', () => {
    it('should return true for .env files', () => {
      expect(isEnvFile('.env')).toBe(true);
      expect(isEnvFile('test.env')).toBe(true);
      expect(isEnvFile('project.env')).toBe(true);
    });

    it('should return true for .env.* files', () => {
      expect(isEnvFile('.env.local')).toBe(true);
      expect(isEnvFile('.env.development')).toBe(true);
      expect(isEnvFile('.env.production')).toBe(true);
    });

    it('should return true for .envrc files', () => {
      expect(isEnvFile('.envrc')).toBe(true);
      expect(isEnvFile('project.envrc')).toBe(true);
    });

    it('should return false for non-env files', () => {
      expect(isEnvFile('file.txt')).toBe(false);
      expect(isEnvFile('script.js')).toBe(false);
      expect(isEnvFile('README.md')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isEnvFile('.ENV')).toBe(true);
      expect(isEnvFile('.Env.Local')).toBe(true);
      expect(isEnvFile('project.ENV')).toBe(true);
    });
  });

  describe('findEnvVariables', () => {
    it('should match simple key-value pairs', () => {
      const text = 'API_KEY=abc123';
      const matches = findEnvVariables(text);

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe('API_KEY');
      expect(matches[0][2]).toBe('abc123');
    });

    it('should match key-value pairs with export', () => {
      const text = 'export DATABASE_URL=postgres://user:pass@localhost:5432/db';
      const matches = findEnvVariables(text);

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe('DATABASE_URL');
      expect(matches[0][2]).toBe('postgres://user:pass@localhost:5432/db');
    });

    it('should match keys with underscores and numbers', () => {
      const text = 'API_KEY_2=abc123';
      const matches = findEnvVariables(text);

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe('API_KEY_2');
      expect(matches[0][2]).toBe('abc123');
    });

    it('should match values with spaces', () => {
      const text = 'MESSAGE=Hello World';
      const matches = findEnvVariables(text);

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe('MESSAGE');
      expect(matches[0][2]).toBe('Hello World');
    });

    it('should match multiple env vars in a string', () => {
      const text = `API_KEY=abc123
DATABASE_URL=postgres://localhost:5432/db
export DEBUG=true`;

      const matches = findEnvVariables(text);
      expect(matches.length).toBe(3);
    });

    it('should not match invalid env var declarations', () => {
      const invalidLines = [
        '# This is a comment',
        'Invalid line without equals',
        '=ValueWithoutKey',
        '123KEY=invalid key starting with number',
      ];

      for (const line of invalidLines) {
        const matches = findEnvVariables(line);
        expect(matches.length).toBe(0);
      }
    });
  });
});
