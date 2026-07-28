import React from 'react';
import { cn } from '@/lib/utils';
import { resolveColorValue } from './colorUtils';

/**
 * Color configuration object for theme-aware colors
 */
export interface ColorConfig {
  light?: string;
  dark?: string;
}

/**
 * Caption component props
 */
export interface CaptionProps {
  /**
   * Text content to display (required)
   */
  value: string;

  /**
   * Size of the caption text
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Font weight
   * @default "normal"
   */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';

  /**
   * Text color
   * Accepts text color token, primitive color token, CSS string, or theme-aware config
   * Text color tokens: prose, primary, emphasis, secondary, tertiary, success, warning, danger
   * @default "secondary"
   */
  color?: string | ColorConfig;

  /**
   * Horizontal text alignment
   * @default "start"
   */
  textAlign?: 'start' | 'center' | 'end';

  /**
   * Truncate overflow with ellipsis
   * @default false
   */
  truncate?: boolean;

  /**
   * Limit text to maximum number of lines (line clamp)
   */
  maxLines?: number;

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
 * Size to CSS class mapping
 * Note: Font size is now controlled via CSS attribute selectors in widgets.css
 */
const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: '',
  md: '',
  lg: '',
};

/**
 * Weight to CSS class mapping
 */
const weightClasses: Record<'normal' | 'medium' | 'semibold' | 'bold', string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

/**
 * Text alignment to CSS class mapping
 */
const textAlignClasses: Record<'start' | 'center' | 'end', string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

/**
 * Caption Component - Supplemental text for descriptions or hints
 *
 * A lightweight text component for displaying secondary information,
 * help text, or captions below form fields and other content.
 *
 * @example
 * ```tsx
 * <Caption value="This is a helpful hint" size="md" />
 * ```
 *
 * @example
 * ```tsx
 * <Caption
 *   value="Error message in red"
 *   color="danger"
 *   weight="semibold"
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Caption",
 *   "value": "Supplemental text",
 *   "size": "md",
 *   "color": "secondary"
 * }
 * ```
 */
export const Caption: React.FC<CaptionProps> = ({
  value,
  size = 'md',
  weight = 'normal',
  color = 'secondary',
  textAlign = 'start',
  truncate = false,
  maxLines,
  className = '',
  cssStyle,
}) => {
  // Resolve color value (text token, primitive token, or CSS color)
  const colorResolver = typeof color === 'string' ? resolveColorValue(color) : {};
  const colorValue = colorResolver.style || (typeof color === 'string' ? color : undefined);

  const sizeClass = sizeClasses[size];
  const weightClass = weightClasses[weight];
  const alignClass = textAlignClasses[textAlign];

  const wrapperClasses = cn(
    'w-caption',
    sizeClass,
    weightClass,
    alignClass,
    {
      truncate: truncate,
      'line-clamp-2': maxLines === 2,
      'line-clamp-3': maxLines === 3,
      'line-clamp-4': maxLines === 4,
      'line-clamp-5': maxLines === 5,
      'line-clamp-6': maxLines === 6,
    },
    className,
  );

  const inlineStyles: React.CSSProperties = {
    ...cssStyle,
    ...(colorValue && { color: colorValue }),
  };

  return (
    <span
      className={wrapperClasses}
      style={inlineStyles}
      data-w-component="caption"
      data-w-size={size}
      data-w-weight={weight}
    >
      {value}
    </span>
  );
};

export default Caption;
