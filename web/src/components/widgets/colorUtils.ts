/**
 * Color utilities for Text and Title components
 * Handles multiple color formats: text color tokens, primitive color tokens, and CSS colors
 */

/**
 * Text color tokens that map to CSS variables
 */
const TEXT_COLOR_TOKENS = [
  'prose',
  'primary',
  'emphasis',
  'secondary',
  'tertiary',
  'success',
  'warning',
  'danger',
] as const;

/**
 * Check if a color value is a text color token
 * @param color The color value to check
 * @returns True if the color is a valid text color token
 */
export function isTextColorToken(color: string): color is (typeof TEXT_COLOR_TOKENS)[number] {
  return TEXT_COLOR_TOKENS.includes(color as any);
}

/**
 * Check if a color value is a primitive color token (Tailwind)
 * Primitive color tokens follow the pattern: colorname-xxx (e.g., red-100, blue-900, gray-500)
 * @param color The color value to check
 * @returns True if the color looks like a primitive color token
 */
export function isPrimitiveColorToken(color: string): boolean {
  return /^[a-z]+-\d{1,3}$/.test(color);
}

/**
 * Check if a color value is a CSS color (hex, rgb, or named)
 * Matches: hex (#112233, #fff), rgb(1,2,3), and CSS named colors (blue, red, etc)
 * @param color The color value to check
 * @returns True if the color looks like a CSS color
 */
export function isCSSColor(color: string): boolean {
  // Hex color: #xxx or #xxxxxx
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    return true;
  }

  // rgb/rgba color: rgb(...) or rgba(...)
  if (/^rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
    return true;
  }

  // hsl/hsla color: hsl(...) or hsla(...)
  if (/^hsla?\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
    return true;
  }

  // CSS named colors or currentColor
  if (/^[a-z]+$/i.test(color)) {
    return true;
  }

  return false;
}

/**
 * Convert a color value to a CSS color property value
 * Supports three formats:
 * 1. Text color tokens (prose, primary, etc) -> CSS variables
 * 2. Primitive color tokens (red-100, blue-900) -> Tailwind classes
 * 3. CSS colors (blue, #112233, rgb(1,2,3)) -> Direct CSS values
 *
 * @param color The color value to convert
 * @returns { style?: string, className?: string } CSS property value or Tailwind class name
 */
export function resolveColorValue(color: string): { style?: string; className?: string } {
  if (!color) {
    return {};
  }

  // 1. Check if it's a text color token (maps to CSS variable)
  if (isTextColorToken(color)) {
    return {
      style: `var(--color-text-${color})`,
    };
  }

  // 2. Check if it's a primitive color token (red-100, blue-900, etc)
  if (isPrimitiveColorToken(color)) {
    return {
      style: `var(--${color})`,
    };
  }

  // 3. Check if it's a CSS color (hex, rgb, named colors)
  if (isCSSColor(color)) {
    return {
      style: color,
    };
  }

  // Fallback: treat as CSS color
  return {
    style: color,
  };
}

/**
 * Convert hex color to RGB format
 * @param hex Hex color string (e.g., '#378CD1')
 * @returns RGB color string (e.g., 'rgb(55, 140, 209)')
 */
export function hexToRgb(hex: string): string {
  // Remove '#' if present
  const cleanHex = hex.replace(/^#/, '');
  
  // Handle 3-digit hex (#fff -> #ffffff)
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  // Parse hex values
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  // Return RGB string
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert linear-gradient with hex colors to RGB format
 * @param gradientStr Gradient string (e.g., 'linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)')
 * @returns Gradient string with RGB colors
 */
export function convertGradientHexToRgb(gradientStr: string): string {
  // Match hex colors in the gradient string and replace them with RGB
  return gradientStr.replace(/#[0-9a-fA-F]{3,6}\b/g, (hex) => hexToRgb(hex));
}

export default {
  isTextColorToken,
  isPrimitiveColorToken,
  isCSSColor,
  resolveColorValue,
  hexToRgb,
  convertGradientHexToRgb,
};
