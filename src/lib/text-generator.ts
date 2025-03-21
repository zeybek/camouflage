import { HiddenTextStyle } from '../core/types';
import * as config from '../utils/config';

/**
 * Generate hidden text based on style and length
 */
export function generateHiddenText(
  style: HiddenTextStyle,
  length: number,
  originalText?: string
): string {
  switch (style) {
    case HiddenTextStyle.DOTTED:
      return '•'.repeat(length);
    case HiddenTextStyle.STARS:
      return '*'.repeat(length);
    case HiddenTextStyle.TEXT:
      return config.getConfig().get('appearance.hiddenText', '************************');
    case HiddenTextStyle.SCRAMBLE:
      // Need the original text to scramble
      if (originalText) {
        return scrambleText(originalText);
      }
      // Fallback to stars if no original text provided
      return '*'.repeat(length);
    default:
      return '*'.repeat(length);
  }
}

/**
 * Scramble text by shuffling characters
 * @param text The text to scramble
 * @returns Scrambled text
 */
function scrambleText(text: string): string {
  // Don't scramble very short texts
  if (text.length <= 2) {
    return '*'.repeat(text.length);
  }

  // Convert to array for shuffling
  const chars = text.split('');

  // Fisher-Yates shuffle algorithm
  for (let i = chars.length - 1; i > 0; i--) {
    // Pick a random index before the current one
    const j = Math.floor(Math.random() * (i + 1));
    // Swap characters at indices i and j
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  // Optional: preserve first and last character position for better security
  // as the first and last characters are often more identifiable
  if (text.length > 3) {
    // Swap back the first and last characters to their original positions
    if (chars[0] !== text[0]) {
      const firstCharIndex = chars.findIndex((char) => char === text[0]);
      if (firstCharIndex !== -1) {
        [chars[0], chars[firstCharIndex]] = [chars[firstCharIndex], chars[0]];
      }
    }

    if (chars[chars.length - 1] !== text[text.length - 1]) {
      const lastCharIndex = chars.findIndex((char) => char === text[text.length - 1]);
      if (lastCharIndex !== -1) {
        [chars[chars.length - 1], chars[lastCharIndex]] = [
          chars[lastCharIndex],
          chars[chars.length - 1],
        ];
      }
    }
  }

  return chars.join('');
}
