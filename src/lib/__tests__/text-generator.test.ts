import { describe, expect, it, jest } from '@jest/globals';
import * as config from '../../utils/config';
import { generateHiddenText } from '../text-generator';

// Mock config module
jest.mock('../../utils/config', () => ({
  getConfig: jest.fn(),
}));

describe('text-generator', () => {
  describe('generateHiddenText', () => {
    it('should generate dotted text with specified length', () => {
      // Arrange
      const style = 'dotted';
      const length = 5;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('•••••');
      expect(result.length).toBe(length);
    });

    it('should generate stars text with specified length', () => {
      // Arrange
      const style = 'stars';
      const length = 8;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('********');
      expect(result.length).toBe(length);
    });

    it('should get text from config for text style', () => {
      // Arrange
      const style = 'text';
      const length = 10; // This value will not be used
      const mockConfigValue = {
        get: jest.fn().mockReturnValue('HIDDEN_VALUE'),
      };

      (config.getConfig as jest.Mock).mockReturnValue(mockConfigValue);

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('HIDDEN_VALUE');
      expect(config.getConfig).toHaveBeenCalled();
      expect(mockConfigValue.get).toHaveBeenCalledWith(
        'appearance.hiddenText',
        '************************'
      );
    });

    it('should use default value if config returns undefined', () => {
      // Arrange
      const style = 'text';
      const length = 10;
      const defaultValue = '************************';
      const mockConfigValue = {
        get: jest.fn().mockReturnValue(undefined),
      };

      // Set up mock - make get function return defaultValue when called
      mockConfigValue.get.mockImplementation((key, defaultVal) => defaultVal);

      (config.getConfig as jest.Mock).mockReturnValue(mockConfigValue);

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe(defaultValue);
      expect(mockConfigValue.get).toHaveBeenCalledWith('appearance.hiddenText', defaultValue);
    });

    it('should fallback to stars for unknown style', () => {
      // Arrange
      const style = 'unknown' as any;
      const length = 6;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('******');
      expect(result.length).toBe(length);
    });

    it('should handle zero length', () => {
      // Arrange
      const style = 'stars';
      const length = 0;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('');
      expect(result.length).toBe(0);
    });

    it('should handle large length', () => {
      // Arrange
      const style = 'dotted';
      const length = 1000;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result.length).toBe(length);
      expect(result).toBe('•'.repeat(length));
    });
  });
});
