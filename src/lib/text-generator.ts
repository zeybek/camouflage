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

  // Array.from (not split) keeps surrogate pairs / emoji intact.
  const chars = Array.from(text);

  // Fisher-Yates shuffle algorithm
  for (let i = chars.length - 1; i > 0; i--) {
    // Pick a random index before the current one
    const j = Math.floor(Math.random() * (i + 1));
    // Swap characters at indices i and j
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
