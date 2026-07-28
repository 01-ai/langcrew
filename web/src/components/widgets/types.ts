import React from 'react';
import { BackgroundColor, BorderRadius } from '@/types';

/**
 * Common styleable props interface
 * Used by layout components that support styling (Box, Row, Col, etc.)
 * Extends React.PropsWithChildren to include children, className, and style support
 */
export interface StyleableProps extends React.PropsWithChildren {
  /**
   * Component type identifier for CSS class generation
   * @default 'box'
   */
  component?: string;

  // ============================================
  // Layout Properties
  // ============================================

  /**
   * Space between direct children (in rem units)
   * @example gap={2} // generates gap: 2rem
   */
  gap?: number | string;

  /**
   * Inner padding (in rem units)
   * @example padding={4} // generates padding: 4rem
   * @example padding={{ y: 8, x: 4 }} :
   *     --w-box-gutter-block-start: 2rem;
   *     --w-box-gutter-block-end: 2rem;
   *     --w-box-gutter-inline-start: 1rem;
   *     --w-box-gutter-inline-end: 1rem;
   *     padding-block: 2rem;
   *     padding-inline: 1rem;
   * @example padding={{ top: 8, bottom: 4, left: 2, right: 6 }} // supports side-specific padding values
   * @example padding={{ x: 4, top: 6 }} // axis values mix with side overrides (side has higher priority)
   * @example padding={{ x: 4, top: 4, bottom: 1 }} // mix with multiple side overrides
   */
  padding?: string | number | object;

  /**
   * Cross-axis alignment of children
   * Aligns items on the axis perpendicular to the flex direction
   * @example align="center" // centers items vertically in row, horizontally in col
   */
  align?: 'start' | 'center' | 'end' | 'stretch';

  /**
   * Main-axis distribution of children
   * Distributes items along the primary flex direction
   * @example justify="between" // space-between layout
   */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';

  /**
   * Flex direction for content layout
   * Determines whether items flow horizontally or vertically
   * @default 'col'
   * @example direction="row" // horizontal layout
   * @example direction="col" // vertical layout
   */
  direction?: 'row' | 'col';

  /**
   * Wrap behavior for flex items
   * Controls whether flex items wrap to multiple lines
   * @default 'nowrap'
   */
  wrap?: 'wrap' | 'nowrap';

  // ============================================
  // Size Properties
  // ============================================

  /**
   * Explicit width (in pixels or CSS string)
   * @example width={360} // generates width: 360px
   * @example width="100%" // CSS string passthrough
   */
  width?: number | string;

  /**
   * Minimum width constraint (in pixels)
   * @example minWidth={280}
   */
  minWidth?: number | string;

  /**
   * Maximum width constraint (in pixels)
   * @example maxWidth={800}
   */
  maxWidth?: number | string;

  /**
   * Explicit height (in pixels or CSS string)
   * @example height={200} // generates height: 200px
   * @example height="100%" // CSS string passthrough
   */
  height?: number | string;

  /**
   * Shorthand for setting both width and height (in pixels or CSS string)
   * Sets width and height to the same value
   * @example size={40} // generates width: 40px; height: 40px
   * @example size="100%" // generates width: 100%; height: 100%
   */
  size?: number | string;

  /**
   * Minimum height constraint (in pixels)
   * @example minHeight={200}
   */
  minHeight?: number | string;

  /**
   * Maximum height constraint (in pixels)
   * @example maxHeight={600}
   */
  maxHeight?: number | string;

  // ============================================
  // Style Properties
  // ============================================

  /**
   * Background color or gradient
   * Supports:
   * - Predefined color tokens: 'surface-tertiary', 'surface-elevated'
   * - CSS gradients: 'linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)'
   * - CSS colors: '#fff', 'rgb(255, 0, 0)', 'blue'
   * Hex colors in gradients will be automatically converted to RGB format
   * @example background="surface-tertiary" // uses CSS variable
   * @example background="linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)" // converts hex to RGB
   * @example background="blue-100" // uses CSS variable
   */
  background?: BackgroundColor;

  /**
   * Border radius preset
   * Predefined rounded corner values
   * @example radius="md" // moderate rounding
   * @example radius="full" // fully rounded (9999px)
   */
  radius?: BorderRadius;

  /**
   * Border configuration
   * Border applied to the container; accepts a numeric pixel value or a border object.
   * @example border={1} // generates border-width: 1px;
   * @example border={{ size: 1, color: "blue-400", style: "dashed" }} // generates border: 1px dashed var(--blue-400);
   */
  border?:
    | number
    | {
        size?: number;
        color?: string;
        style?: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';
      };

  /**
   * Flex growth/shrink factor
   * Controls how flex items grow and shrink
   * @example flex="1" // grow to fill available space
   * @example flex="0 0 auto" // don't grow or shrink
   */
  flex?: string | number;

  // ============================================
  // HTML Properties
  // ============================================

  /**
   * Child components to render inside the container
   * Passed through React.PropsWithChildren
   */
  children?: React.ReactNode;

  /**
   * Additional CSS class names
   * Merged with generated classes via cn() utility
   * @example className="custom-class" // appended to generated classes
   */
  className?: string;

  /**
   * Inline CSS styles
   * Applied after CSS-in-JS styles (will override)
   * @example style={{ zIndex: 100 }}
   */
  style?: React.CSSProperties;

  /**
   * Theme attribute
   * Sets the data-theme attribute for theme-related styling
   * Only renders data-theme attribute if theme is provided
   * @example theme="dark" // generates data-theme="dark"
   */
  theme?: string;
}

export default StyleableProps;

export type ActionConfig = {
  type: string;
  payload?: Record<string, unknown>;
  handler?: 'server' | 'client';
  loadingBehavior?: 'auto' | 'none' | 'self' | 'container';
};

/** Border radius token or CSS keyword/percentage. */
export type RadiusValue = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full' | '100%' | 'none';

export type Margin = {
  /** Top margin; accepts a spacing unit or CSS string. */
  top?: number | string;
  /** Right margin; accepts a spacing unit or CSS string. */
  right?: number | string;
  /** Bottom margin; accepts a spacing unit or CSS string. */
  bottom?: number | string;
  /** Left margin; accepts a spacing unit or CSS string. */
  left?: number | string;
  /** Horizontal margin; accepts a spacing unit or CSS string. */
  x?: number | string;
  /** Vertical margin; accepts a spacing unit or CSS string. */
  y?: number | string;
};

/** Common layout props for block-like components. */
export type BlockProps = {
  /** Explicit height; accepts a numeric pixel value or a CSS string. */
  height?: number | string;
  /** Explicit width; accepts a numeric pixel value or a CSS string. */
  width?: number | string;
  /** Shorthand to set both width and height; accepts a numeric pixel value or a CSS string. */
  size?: number | string;
  /** Minimum height constraint; accepts a numeric pixel value or a CSS string. */
  minHeight?: number | string;
  /** Minimum width constraint; accepts a numeric pixel value or a CSS string. */
  minWidth?: number | string;
  /** Shorthand to set both minWidth and minHeight; accepts a numeric pixel value or a CSS string. */
  minSize?: number | string;
  /** Maximum height constraint; accepts a numeric pixel value or a CSS string. */
  maxHeight?: number | string;
  /** Maximum width constraint; accepts a numeric pixel value or a CSS string. */
  maxWidth?: number | string;
  /** Shorthand to set both maxWidth and maxHeight; accepts a numeric pixel value or a CSS string. */
  maxSize?: number | string;
  /** Aspect ratio of the box (e.g., 16/9); accepts a numeric value or a CSS string. */
  aspectRatio?: number | string;
  /** Border radius; accepts a radius token. */
  radius?: RadiusValue;
  /** Outer margin; accepts a spacing unit, a CSS string, or a margin object. */
  margin?: number | string | Margin;
};
