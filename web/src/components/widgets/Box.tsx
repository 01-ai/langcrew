import React from 'react';
import { useStyleBuilder } from './styleBuilder';
import { cn } from '@/lib/utils';
import { StyleableProps } from './types';
import { isNumber, isString } from 'lodash-es';

interface BoxProps extends StyleableProps {
  /**
   * Container type
   * @example
   * ```json
   * {
   *   "type": "Card",
   *   "container": "card"
   * }
   * ```
   */
  container?: 'card';
  /**
   * Card size
   * @example
   * ```json
   * {
   *   "type": "Card",
   *   "size": "xs"
   * }
   * ```
   */
  'data-size'?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether to flush the box to negate parent padding
   * When true, generates data-w-flush attribute
   * @default false
   */
  flush?: boolean;
}

/**
 * Box Component - Generic flexible container
 *
 * A versatile layout component that serves as the foundation for building flexible layouts.
 * Combines flexbox layout with spacing, sizing, and styling capabilities.
 *
 * @example
 * ```tsx
 * <Box
 *   padding={4}
 *   gap={2}
 *   direction="row"
 *   align="center"
 *   justify="between"
 *   background="surface-tertiary"
 *   radius="md"
 * >
 *   {children}
 * </Box>
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Box",
 *   "padding": 4,
 *   "gap": 2,
 *   "direction": "row",
 *   "align": "center",
 *   "justify": "between",
 *   "background": "surface-tertiary",
 *   "radius": "md",
 *   "children": [...]
 * }
 * ```
 */
export const Box: React.FC<BoxProps> = (props) => {
  const {
    component = 'box',
    theme,
    padding = 0,
    direction = 'col',
    width,
    height,
    size,
    gap,
    container,
    'data-size': dataSize,
    flush = false,
    flex,
  } = props;

  // use unified style builder
  const { style: boxStyle, className: builtClassName } = useStyleBuilder({
    ...props,
    className: cn([props.className]),
  });

  // Calculate gutter values based on padding
  // Convert padding to rem units (assuming padding is in spacing units: 1 unit = 0.25rem)
  const getPaddingValue = (p: any): string => {
    if (typeof p === 'number') {
      return `${p * 0.25}rem`;
    }
    if (typeof p === 'string') {
      // Try to parse as number first
      const num = parseFloat(p);
      if (!isNaN(num)) {
        return `${num * 0.25}rem`;
      }
      return p;
    }
    return '0px';
  };

  // Handle object-based padding { x, y }
  const parsePadding = (p: any) => {
    if (typeof p === 'object' && p !== null && !Array.isArray(p)) {
      const paddingObj = p as Record<string, unknown>;
      const toPaddingValue = (val: unknown) => (val !== undefined ? getPaddingValue(val) : undefined);

      const inlineAxis =
        toPaddingValue(paddingObj.inline) ??
        toPaddingValue(paddingObj.x) ??
        (direction === 'row' ? toPaddingValue(paddingObj.y) : undefined);
      const blockAxis =
        toPaddingValue(paddingObj.block) ??
        toPaddingValue(paddingObj.y) ??
        (direction === 'row' ? toPaddingValue(paddingObj.x) : undefined);

      const blockStart = toPaddingValue(paddingObj.top) ?? blockAxis ?? '0px';
      const blockEnd = toPaddingValue(paddingObj.bottom) ?? blockAxis ?? '0px';
      const inlineStart = toPaddingValue(paddingObj.left) ?? inlineAxis ?? '0px';
      const inlineEnd = toPaddingValue(paddingObj.right) ?? inlineAxis ?? '0px';

      return {
        blockStart,
        blockEnd,
        inlineStart,
        inlineEnd,
      };
    }

    // For non-object padding, use same value for all
    const value = getPaddingValue(p);
    return {
      blockStart: value,
      blockEnd: value,
      inlineStart: value,
      inlineEnd: value,
    };
  };

  const { blockStart, blockEnd, inlineStart, inlineEnd } = parsePadding(padding);

  // Check if gutter values are not zero
  // Use regex to check if value is zero (0, 0px, 0rem, etc.)
  const isZeroValue = (val: string) => /^0(px|rem)?$/.test(val);
  const hasBlockStartGutter = blockStart && !isZeroValue(blockStart);
  const hasBlockEndGutter = blockEnd && !isZeroValue(blockEnd);
  const hasInlineStartGutter = inlineStart && !isZeroValue(inlineStart);
  const hasInlineEndGutter = inlineEnd && !isZeroValue(inlineEnd);

  const boxStyleWithGutter: React.CSSProperties = {
    ...boxStyle,
    // Set gutter variables for block and inline directions
    ...(hasBlockStartGutter ? { '--w-box-gutter-block-start': blockStart } : {}),
    ...(hasBlockEndGutter ? { '--w-box-gutter-block-end': blockEnd } : {}),
    ...(hasInlineStartGutter ? { '--w-box-gutter-inline-start': inlineStart } : {}),
    ...(hasInlineEndGutter ? { '--w-box-gutter-inline-end': inlineEnd } : {}),
    // Set padding-block and padding-inline
    ...(hasBlockStartGutter || hasBlockEndGutter
      ? {
          paddingBlock: blockStart === blockEnd ? blockStart : `${blockStart} ${blockEnd}`,
        }
      : {}),
    ...(hasInlineStartGutter || hasInlineEndGutter
      ? {
          paddingInline: inlineStart === inlineEnd ? inlineStart : `${inlineStart} ${inlineEnd}`,
        }
      : {}),
    ...(flex !== undefined
      ? isString(flex)
        ? { flex }
        : isNumber(flex)
        ? { flexShrink: flex, flexGrow: flex }
        : { flex }
      : {}),
  } as React.CSSProperties;

  // Determine if we have height/width (either directly or via size)
  const hasHeight = height !== undefined || size !== undefined;
  const hasWidth = width !== undefined || size !== undefined;

  // Only use auto-spacing if gap is not explicitly set
  const shouldUseAutoSpacing = gap === undefined;

  return (
    <div
      data-w-direction={direction}
      data-w-component={component}
      {...(container && { 'data-w-container': container })}
      className={builtClassName}
      style={boxStyleWithGutter}
      {...(shouldUseAutoSpacing && { 'data-w-auto-spacing': '' })}
      {...(hasHeight && { 'data-w-has-height': '' })}
      {...(hasWidth && { 'data-w-has-width': '' })}
      {...(theme && { 'data-theme': theme })}
      {...(dataSize && { 'data-size': dataSize })}
      {...(flush && { 'data-w-flush': '' })}
      {...(direction === 'row' && { 'data-w-align': 'center' })}
    >
      {props.children}
    </div>
  );
};

export default Box;
