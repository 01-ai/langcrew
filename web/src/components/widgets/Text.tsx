import React from 'react';
import { TextWeight, TextSize, TextColor } from '@/types';
import useStyleBuilder from './styleBuilder';
import { cn } from '@/lib/utils';
import { resolveColorValue } from './colorUtils';
import { Input } from 'antd';

/**
 * Text component props
 * Supports typography styling with weight, size, and color
 */
export interface TextProps {
  /**
   * Text content to display
   * Use either value or children, value takes precedence if both provided
   * @example value="Hello World"
   */
  value?: string;

  /**
   * Child content to render
   * Used if value is not provided
   * @example children={<strong>Bold text</strong>}
   */
  children?: React.ReactNode;

  /**
   * Font weight of the text
   * "normal" "medium" "semibold" "bold"
   * @default "normal"
   */
  weight?: TextWeight;

  /**
   * Font size of the text
   * Predefined size scale from xs to xl
   * "sm" "md" "lg" "xl" "xs"
   * @default "md"
   */
  size?: TextSize;

  /**
   * Text color; supports three formats:
   * 1. Text color tokens: prose, primary, emphasis, secondary, tertiary, success, warning, danger
   * 2. Primitive color token: e.g. red-100, blue-900, gray-500
   * 3. CSS color: e.g. blue, #112233, rgb(1,2,3)
   */
  color?: TextColor | string;

  /**
   * Enables streaming-friendly transitions for incremental updates
   * Important: Once incremental updates are complete, this should be set to false
   * Note: Streaming animations are not currently implemented for basic text components,
   * but we plan to add them in the future.
   * @default false
   */
  streaming?: boolean;

  /**
   * Render text in italic style
   * @example italic={true}
   */
  italic?: boolean;

  /**
   * Render text with a line-through decoration
   * @example lineThrough={true}
   */
  lineThrough?: boolean;

  /**
   * Constrain the text container width
   * Accepts a numeric pixel value or a CSS string
   * @example width={200} // 200px
   * @example width="100%" // full width
   */
  width?: string | number;

  /**
   * Forces the text container to reserve space for a minimum number of lines
   * @example minLines={3}
   */
  minLines?: number;

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
   * @example className="line-through" // strikethrough text
   */
  className?: string;

  /**
   * Inline CSS styles
   * Applied after CSS-in-JS styles
   * @example style={{ letterSpacing: "0.1em" }}
   */
  style?: React.CSSProperties;

  /**
   * Enable inline editing for this text node.
   *
   * @default false
   */
  editable?:
    | false
    | {
        /**
         * The name of the form control field.
         * When the form is submitted, the value of this field will be included in the form's \`onSubmitAction\` payload.
         *
         * **Note:** Dot-separated paths are supported. e.g. \`"myData.myFieldName"\` → \`payload.myData.myFieldName\`
         */
        name: string;
        /** Placeholder text for the editable input. */
        placeholder?: string;
        /**
         * Autofocus the editable input when it appears.
         * @default false
         */
        autoFocus?: boolean;
        /**
         * Select all text on focus.
         * @default false
         */
        autoSelect?: boolean;
        /** Native autocomplete hint for the input. */
        autoComplete?: string;
        /**
         * Allow browser password/autofill extensions.
         * @default false
         */
        allowAutofillExtensions?: boolean;
        /** Regex pattern for input validation. */
        pattern?: string;
        /**
         * Mark the editable input as required.
         * @default false
         */
        required?: boolean;
      };
}

/**
 * Text Component - For rendering text content
 *
 * A typography component that renders spans with flexible styling options.
 * Supports font weight, size, and color customization.
 *
 * @example
 * ```tsx
 * <Text value="Hello" weight="semibold" size="lg" color="primary" />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Text",
 *   "value": "Hello",
 *   "weight": "semibold",
 *   "size": "lg",
 *   "color": "primary"
 * }
 * ```
 */
export const Text: React.FC<TextProps> = ({
  value,
  children,
  size = 'md',
  color = 'prose',
  weight = 'normal',
  className = '',
  italic = false,
  lineThrough = false,
  textAlign = 'start',
  truncate = false,
  maxLines = undefined,
  editable,
  minLines = 1,
  ...props
}) => {
  // Resolve color value (text token, primitive token, or CSS color)
  const { style: colorStyle, className: colorClassName } = resolveColorValue(color);

  // Build font size, line height, and font weight CSS variables
  const fontSizeValue = size ? `var(--font-text-${size}-size)` : undefined;
  const lineHeightValue = size ? `var(--font-text-${size}-line-height)` : undefined;
  const fontWeightValue = weight ? `var(--font-weight-${weight})` : undefined;

  const defaultClassName = cn(['w-text'], colorClassName, className);

  const styles: React.CSSProperties = {
    ...(fontSizeValue && { fontSize: fontSizeValue }),
    ...(lineHeightValue && { lineHeight: lineHeightValue }),
    ...(fontWeightValue && { fontWeight: fontWeightValue }),
    ...(colorStyle && { color: colorStyle }),
    ...(italic && { fontStyle: 'italic' }),
    ...(lineThrough && { textDecoration: 'line-through' }),
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
  };

  const { style: textStyle, className: textClassName } = useStyleBuilder({
    ...props,
    className: defaultClassName,
    style: styles,
  });

  if (editable) {
    return (
      <div className="relative max-w-full flex-1" data-w-component="text">
        <Input.TextArea
          name={editable.name}
          defaultValue={value}
          placeholder={editable.placeholder}
          required={editable.required}
          autoFocus={editable.autoFocus}
          autoComplete={editable.autoComplete}
          variant="borderless"
          autoSize={{ minRows: minLines || 1, maxRows: maxLines || 1 }}
          style={{ ...textStyle, padding: 0 }}
        />
      </div>
    );
  }

  return (
    <span className={textClassName} style={textStyle} data-w-component="text">
      {value !== undefined ? value : children}
    </span>
  );
};

export default Text;
