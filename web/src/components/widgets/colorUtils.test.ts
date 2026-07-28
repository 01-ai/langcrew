import { describe, it, expect } from 'vitest';
import { hexToRgb, convertGradientHexToRgb } from './colorUtils';

describe('Color Utils', () => {
  describe('hexToRgb', () => {
    it('should convert 6-digit hex to rgb', () => {
      expect(hexToRgb('#378CD1')).toBe('rgb(55, 140, 209)');
      expect(hexToRgb('#2B67AC')).toBe('rgb(43, 103, 172)');
    });

    it('should convert 3-digit hex to rgb', () => {
      expect(hexToRgb('#fff')).toBe('rgb(255, 255, 255)');
      expect(hexToRgb('#000')).toBe('rgb(0, 0, 0)');
    });

    it('should handle hex without # prefix', () => {
      expect(hexToRgb('378CD1')).toBe('rgb(55, 140, 209)');
    });
  });

  describe('convertGradientHexToRgb', () => {
    it('should convert linear-gradient with hex colors', () => {
      const input = 'linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)';
      const output = 'linear-gradient(135deg, rgb(55, 140, 209) 0%, rgb(43, 103, 172) 100%)';
      expect(convertGradientHexToRgb(input)).toBe(output);
    });

    it('should handle radial-gradient', () => {
      const input = 'radial-gradient(circle, #fff 0%, #000 100%)';
      const output = 'radial-gradient(circle, rgb(255, 255, 255) 0%, rgb(0, 0, 0) 100%)';
      expect(convertGradientHexToRgb(input)).toBe(output);
    });

    it('should handle gradient with multiple colors', () => {
      const input = 'linear-gradient(90deg, #ff0000 0%, #00ff00 50%, #0000ff 100%)';
      const output = 'linear-gradient(90deg, rgb(255, 0, 0) 0%, rgb(0, 255, 0) 50%, rgb(0, 0, 255) 100%)';
      expect(convertGradientHexToRgb(input)).toBe(output);
    });
  });
});
