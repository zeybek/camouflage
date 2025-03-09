import { HiddenTextStyle } from '../core/types';
import * as config from '../utils/config';

/**
 * Generate hidden text based on style and length
 */
export function generateHiddenText(style: HiddenTextStyle, length: number): string {
  switch (style) {
    case 'dotted':
      return '•'.repeat(length);
    case 'stars':
      return '*'.repeat(length);
    case 'text':
      return config.getConfig().get('appearance.hiddenText', '************************');
    default:
      return '*'.repeat(length);
  }
}
