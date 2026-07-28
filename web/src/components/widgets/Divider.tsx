import React from 'react';
import { cn } from '@/lib/utils';
import { isTextColorToken, isPrimitiveColorToken, isCSSColor, resolveColorValue } from './colorUtils';

/**
 * Background configuration object for theme-aware colors
 */
export interface ColorConfig {
  light?: string;
  dark?: string;
}

/**
 * Divider component props
 */
export interface DividerProps {
  /**
   * Color of the divider; accepts border color token, a primitive color token, a CSS string, or theme-aware { light, dark }
   * Valid tokens: "default", "subtle", "strong"
   * Primitive color token: e.g. "red-100", "blue-900", "gray-500"
   * @default "default"
   */
  color?: string | ColorConfig;

  /**
   * Thickness of the divider line; accepts a numeric pixel value or a CSS string
   * @default 1
   */
  size?: string | number;

  /**
   * Outer spacing applied above and below the divider; accepts a spacing unit or a CSS string
   * By default, the divider will space itself dynamically based on its siblings' default spacings
   */
  spacing?: string | number;

  /**
   * Flush the divider to the edge of its container, removing surrounding padding
   * @default false
   */
  flush?: boolean;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Inline CSS styles
   */
  cssStyle?: React.CSSProperties;
}

/**
 * Border color token to CSS variable mapping
 */
const borderColorTokens: Record<string, string> = {
  default: 'var(--color-border)',
  subtle: 'var(--color-border-subtle, var(--color-border))',
  strong: 'var(--color-border-strong, var(--color-border))',
};

/**
 * Check if a color value is a border color token
 */
const isBorderColorToken = (color: string): boolean => {
  return color in borderColorTokens;
};

/**
 * Get color value from token or config
 * Supports:
 * 1. Border color tokens (default, subtle, strong)
 * 2. Primitive color tokens (red-100, blue-900, etc)
 * 3. CSS colors (hex, rgb, named colors)
 * 4. Theme-aware config objects
 */
const getColorValue = (color: string | ColorConfig | undefined): string => {
  if (!color) return borderColorTokens.default;

  // Handle theme-aware config objects
  if (typeof color === 'object') {
    // For theme-aware config, return light mode value as fallback
    const colorValue = color.light || color.dark || borderColorTokens.default;
    return getColorValue(colorValue);
  }

  // Handle border color tokens
  if (isBorderColorToken(color)) {
    return borderColorTokens[color];
  }

  // Handle primitive color tokens (red-100, blue-900, etc)
  if (isPrimitiveColorToken(color)) {
    return `var(--${color})`;
  }

  // Handle CSS colors or direct color values
  if (isCSSColor(color)) {
    return color;
  }

  // Fallback: treat as custom CSS value
  return color;
};

/**
 * Convert size value to CSS
 */
const getSizeValue = (size: string | number | undefined): string => {
  if (size === undefined) return '1px';
  if (typeof size === 'number') return `${size}px`;
  return size;
};

/**
 * Convert spacing value to CSS
 */
const getSpacingValue = (spacing: string | number | undefined): string | undefined => {
  if (spacing === undefined) return undefined;
  if (typeof spacing === 'number') return `${spacing * 0.25}rem`;
  return spacing;
};

/**
 * Divider Component - Separate content with a thin line
 *
 * A lightweight divider component used to visually separate content sections.
 * Supports customizable colors, thickness, spacing, and flexible color formats.
 *
 * Supported color formats:
 * - Border color tokens: "default", "subtle", "strong"
 * - Primitive color tokens: "red-100", "blue-900", "gray-500", etc.
 * - CSS colors: "#fff", "rgb(255, 0, 0)", "blue", etc.
 * - Theme-aware config: { light: "...", dark: "..." }
 *
 * @example
 * // Basic usage with spacing
 * ```tsx
 * <Col>
 *   <Text>Section 1</Text>
 *   <Divider spacing={2} />
 *   <Text>Section 2</Text>
 * </Col>
 * ```
 *
 * @example
 * // Custom color and size
 * ```tsx
 * <Divider color="strong" size={2} />
 * ```
 *
 * @example
 * // Using primitive color token
 * ```tsx
 * <Divider color="red-100" size={1.5} spacing={3} />
 * ```
 *
 * @example
 * // Using CSS color
 * ```tsx
 * <Divider color="#e0e0e0" size="2px" />
 * ```
 *
 * @example
 * // Theme-aware color configuration
 * ```tsx
 * <Divider color={{ light: '#e0e0e0', dark: '#2a2a2a' }} />
 * ```
 *
 * @example
 * // JSON configuration
 * ```json
 * {
 *   "type": "Divider",
 *   "color": "default",
 *   "size": 1,
 *   "spacing": 2
 * }
 * ```
 */
export const Divider: React.FC<DividerProps> = ({
  color = 'default',
  size = 1,
  spacing,
  flush = false,
  className = '',
  cssStyle,
}) => {
  const colorValue = getColorValue(color);
  const sizeValue = getSizeValue(size);
  const spacingValue = getSpacingValue(spacing);

  const wrapperClasses = cn(
    'w-divider',
    {
      'divider-flush': flush,
    },
    className,
  );

  const inlineStyles: React.CSSProperties = {
    ...cssStyle,
    '--divider-color': colorValue,
    '--divider-size': sizeValue,
    // When flush is true, set margin-inline to negate parent padding
    // and adjust width to compensate for negative margins
    ...(flush && {
      marginInlineStart: 'calc(-1 * var(--w-box-gutter-inline-start, 0px))',
      marginInlineEnd: 'calc(-1 * var(--w-box-gutter-inline-end, 0px))',
      width: 'calc(100% + var(--w-box-gutter-inline-start, 0px) + var(--w-box-gutter-inline-end, 0px))',
    }),
    // When spacing is set, use it for margin-block
    ...(spacingValue && {
      '--divider-spacing': spacingValue,
      marginBlock: spacingValue,
    }),
  } as React.CSSProperties;

  return (
    <div
      className={wrapperClasses}
      style={inlineStyles}
      data-w-component="divider"
      {...(flush && { 'data-w-flush': true })}
      {...(spacingValue && { 'data-w-manual-spacing': true })}
      role="separator"
      aria-orientation="horizontal"
    />
  );
};

export default Divider;
