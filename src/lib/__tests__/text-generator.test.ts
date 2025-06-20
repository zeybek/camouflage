import { describe, expect, it, jest } from '@jest/globals';
import { HiddenTextStyle } from '../../core/types';
import * as config from '../../utils/config';
import { generateHiddenText } from '../text-generator';

// Mock config module
jest.mock('../../utils/config', () => ({
  getConfig: jest.fn(),
}));

// Mock the vscode module for config
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'appearance.hiddenText') {
          return defaultValue || '************************';
        }
        return defaultValue;
      }),
    })),
  },
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

    it('should handle scramble style with single character', () => {
      const originalText = 'a';
      const result = generateHiddenText(
        HiddenTextStyle.SCRAMBLE,
        originalText.length,
        originalText
      );

      expect(result).toBe('*');
    });

    it('should handle scramble style with three characters', () => {
      const originalText = 'abc';
      const result = generateHiddenText(
        HiddenTextStyle.SCRAMBLE,
        originalText.length,
        originalText
      );

      expect(result).toHaveLength(3);
      // For 3+ character strings, first and last character should be preserved (when possible)
      // But due to randomness, we'll just check length and that it contains the same characters
      expect(result.split('').sort()).toEqual(originalText.split('').sort());
    });

    it('should handle scramble style with long text and preserve first/last chars', () => {
      const originalText = 'thisisaverylongpassword';
      const result = generateHiddenText(
        HiddenTextStyle.SCRAMBLE,
        originalText.length,
        originalText
      );

      expect(result).toHaveLength(originalText.length);
      expect(result[0]).toBe('t'); // First character preserved
      expect(result[result.length - 1]).toBe('d'); // Last character preserved
      expect(result).not.toBe(originalText);
    });

    it('should handle scramble when first character already in first position', () => {
      // Test edge case where first character is already at the beginning after shuffle
      const originalText = 'abcdef';

      // Mock Math.random to control the shuffle behavior
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        // Return deterministic values to control shuffle
        return callCount++ % 2 === 0 ? 0.1 : 0.9;
      });

      const result = generateHiddenText(
        HiddenTextStyle.SCRAMBLE,
        originalText.length,
        originalText
      );

      expect(result).toHaveLength(originalText.length);
      expect(result[0]).toBe('a'); // First character preserved
      expect(result[result.length - 1]).toBe('f'); // Last character preserved

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle scramble when last character already in last position', () => {
      const originalText = 'password123';

      // Test multiple runs to ensure edge cases are covered
      for (let i = 0; i < 5; i++) {
        const result = generateHiddenText(
          HiddenTextStyle.SCRAMBLE,
          originalText.length,
          originalText
        );

        expect(result).toHaveLength(originalText.length);
        expect(result[0]).toBe('p'); // First character preserved
        expect(result[result.length - 1]).toBe('3'); // Last character preserved
      }
    });

    it('should handle scramble when character is not found during swap', () => {
      // This tests the edge case where findIndex might return -1
      const originalText = 'unique';
      const result = generateHiddenText(
        HiddenTextStyle.SCRAMBLE,
        originalText.length,
        originalText
      );

      expect(result).toHaveLength(originalText.length);
      expect(result[0]).toBe('u'); // First character preserved
      expect(result[result.length - 1]).toBe('e'); // Last character preserved
    });
  });
});
