import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BackgroundColor } from '@/types';
import { convertGradientHexToRgb } from './colorUtils';
import { isNumber, isString } from 'lodash-es';

/**
 * StyleMap Configuration
 * Note: Text color tokens have been moved to colorUtils.ts
 */
export const styleConfig = {
  // Background Colour Map
  backgroundColorMap: {
    'surface-tertiary': 'var(--color-surface-tertiary)',
    'surface-elevated': 'var(--color-surface-elevated)',
  } as Record<BackgroundColor, string>,
};

/**
 * Process the colour values and convert them to the corresponding colour values CSS Variable or colour value
 * @param colorValue Colour Value
 * @returns CSS Colour values or variable references
 */
export function resolveColorValue(colorValue: string): string {
  if (!colorValue) return colorValue;

  // Check if it's a predefined background color token
  if (styleConfig.backgroundColorMap[colorValue as BackgroundColor]) {
    return styleConfig.backgroundColorMap[colorValue as BackgroundColor];
  }
  // Check if it's a gradient (contains 'gradient')
  if (colorValue.includes('gradient')) {
    return convertGradientHexToRgb(colorValue);
  }
  // Check if it's a surface color token (surface, surface-secondary, surface-tertiary, etc.)
  if (colorValue === 'surface' || colorValue.startsWith('surface-')) {
    return `var(--color-${colorValue})`;
  }
  // Check if it's a numbered color token like red-100, blue-900, gray-500
  if (/^[a-z]+-\d+$/.test(colorValue)) {
    return `var(--${colorValue})`;
  }
  // Otherwise treat as a CSS color value
  return colorValue;
}

/**
 * Style Build Parameter Interface
 */
export interface StyleBuilderProps {
  // Layout Properties
  /**
   * padding: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
   * padding: '10px' | '10px 20px' | '10px 20px 30px' | '10px 20px 30px 40px'
   * padding: {
   *   x: 4,
   *   y: 8,
   * }
   */
  padding?: string | number | object;
  /**
   * gap: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
   */
  gap?: string | number;
  /**
   * align: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
   */
  align?: string;
  /**
   * justify: "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly"
   */
  justify?: string;
  /**
   * 100%
   * 150
   */
  width?: number | string;

  /**
   * 100%
   * 150
   */
  height?: number | string;

  /**
   * Shorthand for width and height
   * 40 | '100%'
   */
  size?: number | string;

  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  direction?: 'row' | 'col';
  /**
   * wrap: "nowrap" | "wrap" | "wrap-reverse"
   */
  wrap?: string;
  /**
   * flex: '0 0 auto' | '1 1 auto' | '0 0 100px' | '0 1 200px'
   */
  flex?: string | number;

  // Style Properties
  /**
   * blue-100 : from tailwind
   * surface-tertiary: from css file
   */
  background?: string;
  /**
   * xl full ...
   */
  radius?: 'sm' | 'md' | 'lg' | 'full' | 'xl' | '2xl' | '2xs' | 'xs' | '3xl' | '4xl' | '100%' | 'none';
  /**
   * Border configuration
   * @example { size: 1, color: "blue-400", style: "dashed" }
   */
  border?:
    | number
    | {
        size?: number;
        color?: string;
        style?: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';
      };

  // Text Properties
  /**
   * medium 、 semibold ...
   */
  weight?: string;
  color?: string;

  // Other
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Return Value Type
 */
export interface StyleBuilderResult {
  style: React.CSSProperties;
  className: string;
}

/**
 * General Style Builder
 * For layout components (Box/Row/Col），UniformCSS-in-JSandTailwindClass Name
 */
export function useStyleBuilder(props: StyleBuilderProps): StyleBuilderResult {
  const {
    gap,
    align,
    justify,
    width,
    height,
    size,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    direction = 'col',
    wrap,
    flex,
    background,
    radius,
    border,
    className = '',
    weight,
    color,
    style = {},
  } = props;

  // CSS-in-JS Style Objects
  const computedStyle = useMemo<React.CSSProperties>(() => {
    let backgroundStyle: string | undefined;
    let smoothingBackgroundColor: string | undefined;

    if (background) {
      backgroundStyle = resolveColorValue(background);
      // Set smoothing background color for surface tokens
      if (background === 'surface' || background.startsWith('surface-')) {
        smoothingBackgroundColor = backgroundStyle;
      }
    }

    // Determine effective width and height
    const effectiveWidth = width !== undefined ? width : size !== undefined ? size : undefined;
    const effectiveHeight = height !== undefined ? height : size !== undefined ? size : undefined;

    let gapStyle: React.CSSProperties = {};
    if (gap) {
      if (isNumber(gap)) {
        gapStyle = { gap: `${Number(gap) * 0.25}rem` };
      }
      if (isString(gap)) {
        gapStyle = { gap: gap };
      }
    }

    // Build border style
    let borderStyle: string | undefined;
    if (border) {
      if (typeof border === 'number') {
        borderStyle = `${border}px solid`;
      } else if (border.size && border.color && border.style) {
        const resolvedColor = resolveColorValue(border.color);
        borderStyle = `${border.size}px ${border.style} ${resolvedColor}`;
      }
    }

    return {
      display: 'flex',
      flexDirection: direction === 'row' ? 'row' : 'column',
      '--smoothing-background-color': smoothingBackgroundColor,
      ...(backgroundStyle && { background: backgroundStyle }),
      ...(borderStyle && { border: borderStyle }),
      ...(wrap && { flexWrap: wrap as any }),
      ...(effectiveWidth !== undefined && {
        width: typeof effectiveWidth === 'number' ? `${effectiveWidth}px` : effectiveWidth,
      }),
      ...(effectiveHeight !== undefined && {
        height: typeof effectiveHeight === 'number' ? `${effectiveHeight}px` : effectiveHeight,
      }),
      ...(minWidth !== undefined && { minWidth: `${minWidth}px` }),
      ...(maxWidth !== undefined && { maxWidth: `${maxWidth}px` }),
      ...(minHeight !== undefined && { minHeight: `${minHeight}px` }),
      ...(maxHeight !== undefined && { maxHeight: `${maxHeight}px` }),
      ...(flex && {
        flex,
      }),
      // flexShrink: 0,

      borderRadius: radius ? `var(--radius-${radius})` : undefined,
      ...gapStyle,
      ...style,
    } as React.CSSProperties;
  }, [
    background,
    border,
    width,
    size,
    height,
    gap,
    direction,
    wrap,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    flex,
    radius,
    style,
  ]);

  // Tailwind classNames
  const computedClassName = useMemo(() => {
    const names = [];

    if (background && !styleConfig.backgroundColorMap[background]) {
      names.push(`bg-${background}`);
    }
    if (align) {
      names.push(`items-${align}`);
    }
    if (justify) {
      names.push(`justify-${justify}`);
    }

    if (weight) {
      names.push(`font-${weight}`);
    }
    return cn(names, className);
  }, [background, align, justify, weight, className]);

  return {
    style: computedStyle,
    className: computedClassName,
  };
}

export default useStyleBuilder;
