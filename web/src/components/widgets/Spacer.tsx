import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Spacer component props
 */
export interface SpacerProps {
  /**
   * Minimum size the spacer should occupy along the flex direction
   * Accepts a numeric pixel value or a CSS string
   * @default "auto"
   * @example minSize={16} // 16px
   * @example minSize="1rem" // 1rem
   */
  minSize?: string | number;

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
 * Spacer Component - Flexible space to separate content
 *
 * A lightweight spacer component that expands to fill available space in flex containers.
 * Useful for pushing content apart or creating flexible spacing in layouts.
 *
 * @example
 * ```tsx
 * <Row>
 *   <Badge label="Left" />
 *   <Spacer minSize={16} />
 *   <Badge label="Right" />
 * </Row>
 * ```
 *
 * @example
 * ```tsx
 * <Row>
 *   <Button label="Back" />
 *   <Spacer />
 *   <Button label="Next" />
 * </Row>
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Spacer",
 *   "minSize": 16
 * }
 * ```
 */
export const Spacer: React.FC<SpacerProps> = ({ minSize = 'auto', className = '', cssStyle }) => {
  // Convert minSize to CSS value
  const getMinSizeValue = (size: string | number | undefined): string => {
    if (size === undefined || size === 'auto') return 'auto';
    if (typeof size === 'number') return `${size}px`;
    return size;
  };

  const minSizeValue = getMinSizeValue(minSize);

  const wrapperClasses = cn('flex-1', 'w-spacer', className);

  const inlineStyles: React.CSSProperties = {
    ...cssStyle,
    flex: '1 1 auto',
    minWidth: minSizeValue,
    minHeight: minSizeValue,
    '--w-spacer-min-size': minSizeValue,
  } as React.CSSProperties;

  return <div className={wrapperClasses} style={inlineStyles} data-w-component="spacer" aria-hidden="true" />;
};

export default Spacer;
