import { describe, expect, it, jest } from '@jest/globals';
import { HiddenTextStyle } from '../../core/types';
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
      const style = HiddenTextStyle.DOTTED;
      const length = 5;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('•••••');
      expect(result.length).toBe(length);
    });

    it('should generate stars text with specified length', () => {
      // Arrange
      const style = HiddenTextStyle.STARS;
      const length = 8;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('********');
      expect(result.length).toBe(length);
    });

    it('should get text from config for text style', () => {
      // Arrange
      const style = HiddenTextStyle.TEXT;
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
      const style = HiddenTextStyle.TEXT;
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
      const style = HiddenTextStyle.STARS;
      const length = 0;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result).toBe('');
      expect(result.length).toBe(0);
    });

    it('should handle large length', () => {
      // Arrange
      const style = HiddenTextStyle.DOTTED;
      const length = 1000;

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      expect(result.length).toBe(length);
      expect(result).toBe('•'.repeat(length));
    });

    it('should scramble text when using scramble style', () => {
      // Arrange
      const style = HiddenTextStyle.SCRAMBLE;
      const length = 10;
      const originalText = 'secret1234';

      // Act
      const result = generateHiddenText(style, length, originalText);

      // Assert
      // Check that result is not the original text but has the same length
      expect(result).not.toBe(originalText);
      expect(result.length).toBe(originalText.length);

      // Check that result contains all the same characters (just in different order)
      const sortedOriginal = originalText.split('').sort().join('');
      const sortedResult = result.split('').sort().join('');
      expect(sortedResult).toBe(sortedOriginal);
    });

    it('should handle scramble style with short text', () => {
      // Arrange
      const style = HiddenTextStyle.SCRAMBLE;
      const length = 2;
      const originalText = 'ab';

      // Act
      const result = generateHiddenText(style, length, originalText);

      // Assert
      // For very short texts, it should fall back to stars
      expect(result).toBe('**');
    });

    it('should handle scramble style without original text', () => {
      // Arrange
      const style = HiddenTextStyle.SCRAMBLE;
      const length = 8;
      // No original text provided

      // Act
      const result = generateHiddenText(style, length);

      // Assert
      // Should fall back to stars when no original text is provided
      expect(result).toBe('********');
    });
  });
});
