import React from 'react';
import { TextWeight, TextSize, TextColor } from '@/types';
import useStyleBuilder from './styleBuilder';
import { cn } from '@/lib/utils';
import { resolveColorValue } from './colorUtils';

export interface TitleProps {
  /**
   * Title text content to display
   * Use either value or children, value takes precedence if both provided
   * @example value="Page Title"
   */
  value?: string;

  /**
   * Child content to render
   * Used if value is not provided
   * @example children={<em>Emphasized title</em>}
   */
  children?: React.ReactNode;

  /**
   * Font weight of the title
   * "normal" "medium" "semibold" "bold"
   * @default "medium"
   */
  weight?: TextWeight;

  /**
   * Font size of the title
   * "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"
   * @default "md"
   * @example size="lg"
   * @example size="2xl"
   */
  size?: TextSize;

  /**
   * Title color
   * Accepts text color tokens (prose, primary, emphasis, secondary, tertiary, success, warning, danger),
   * primitive color tokens (e.g. red-100, blue-900, gray-500), or CSS strings
   * @default "prose"
   * @example color="primary"
   * @example color="red-500"
   */
  color?: TextColor | string;

  /**
   * Horizontal text alignment
   * @default "start"
   * @example textAlign="center"
   */
  textAlign?: 'start' | 'center' | 'end';

  /**
   * Truncate overflow with ellipsis
   * Applies single-line truncation
   * @default false
   * @example truncate={true}
   */
  truncate?: boolean;

  /**
   * Limit text to a maximum number of lines
   * Applies a line clamp
   * @example maxLines={2}
   */
  maxLines?: number;

  /**
   * Additional CSS class names
   * Merged with generated classes
   * @example className="uppercase"
   */
  className?: string;

  /**
   * Inline CSS styles
   * Applied after CSS-in-JS styles
   * @example style={{ textDecoration: "underline" }}
   */
  style?: React.CSSProperties;

  /**
   * HTML heading level (h1-h6)
   * Determines which heading tag is rendered
   * @default 3 (renders as h3)
   * @example level={1} // renders <h1>
   * @example level={2} // renders <h2>
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Title Component - For rendering heading content
 *
 * A semantic heading component that renders heading tags (h1-h6) with flexible styling.
 * Supports font weight, size, color customization, and semantic HTML structure.
 *
 * @example
 * ```tsx
 * <Title value="Main Title" level={1} weight="bold" size="lg" color="primary" />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Title",
 *   "value": "Main Title",
 *   "level": 1,
 *   "weight": "bold",
 *   "size": "lg",
 *   "color": "primary"
 * }
 * ```
 */
export const Title: React.FC<TitleProps> = ({
  value,
  children,
  size,
  weight = 'medium',
  color = 'prose',
  className = '',
  style = {},
  level = 3,
  truncate = false,
  maxLines = undefined,
  textAlign = 'start',
  ...props
}) => {
  const { style: colorStyle, className: colorClassName } = resolveColorValue(color);

  // Build font size, line height, and tracking (letter-spacing) CSS variables for heading styles
  const fontSizeValue = size ? `var(--font-heading-${size}-size)` : undefined;
  const lineHeightValue = size ? `var(--font-heading-${size}-line-height)` : undefined;
  const trackingValue = size ? `var(--font-heading-${size}-tracking)` : undefined;
  const fontWeightValue = weight ? `var(--font-weight-${weight})` : undefined;

  const defaultStyle: React.CSSProperties = {
    margin: 0,
    ...(fontSizeValue && { fontSize: fontSizeValue }),
    ...(lineHeightValue && { lineHeight: lineHeightValue }),
    ...(trackingValue && { letterSpacing: trackingValue }),
    ...(fontWeightValue && { fontWeight: fontWeightValue }),
    ...(colorStyle && { color: colorStyle }),
    ...(textAlign && { textAlign: textAlign }),
    ...(truncate && {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    ...(maxLines && {
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    ...style,
  };

  const defaultClassName = cn(['w-title'], colorClassName, className);

  const { style: titleStyle, className: titleClassName } = useStyleBuilder({
    ...props,
    style: defaultStyle,
    className: defaultClassName,
  });

  const tags = {
    1: 'h1',
    2: 'h2',
    3: 'h3',
    4: 'h4',
    5: 'h5',
    6: 'h6',
  } as const;

  const HeadingTag = tags[level] as any;

  return (
    <HeadingTag className={titleClassName} style={titleStyle} data-w-component="title">
      {value !== undefined ? value : children}
    </HeadingTag>
  );
};

export default Title;
