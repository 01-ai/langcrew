import React, { useRef, useEffect, useState } from 'react';
import { Input } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';

/**
 * Textarea action object
 */
export interface TextareaAction {
  type: string;
  payload?: unknown;
}

/**
 * Textarea component props
 */
export interface TextareaProps {
  /**
   * The name of the form control field (required)
   * When the form is submitted, the value will be included in onSubmitAction payload
   * Supports dot-separated paths: "myData.myFieldName" → payload.myData.myFieldName
   */
  name: string;

  /**
   * Initial value of the textarea
   */
  defaultValue?: string;

  /**
   * Mark the textarea as required for form submission
   * @default false
   */
  required?: boolean;

  /**
   * Placeholder text shown when empty
   */
  placeholder?: string;

  /**
   * Select all contents of the textarea when it mounts
   * @default false
   */
  autoSelect?: boolean;

  /**
   * Autofocus the textarea when it mounts
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Disable interactions and apply disabled styles
   * @default false
   */
  disabled?: boolean;

  /**
   * Visual style of the textarea
   * @default "outline"
   */
  variant?: 'soft' | 'outline';

  /**
   * Controls the size of the textarea
   * @default "md"
   */
  size?: '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

  /**
   * Controls gutter on the edges of the textarea
   * Defaults to value from size
   */
  gutterSize?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Initial number of visible rows
   * @default 3
   */
  rows?: number;

  /**
   * Automatically grow/shrink to fit content
   * @default false
   */
  autoResize?: boolean;

  /**
   * Maximum number of rows when auto-resizing
   * Defaults to Math.max(rows, 10)
   */
  maxRows?: number;

  /**
   * Allow password managers / autofill extensions to appear
   * @default false
   */
  allowAutofillExtensions?: boolean;
}

// Size to text size mapping
const textSizeMap: Record<string, string> = {
  '3xs': 'text-xs',
  '2xs': 'text-xs',
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-base',
  '2xl': 'text-lg',
  '3xl': 'text-lg',
};

// Gutter size mapping
const gutterSizeMap: Record<string, string> = {
  '2xs': 'px-1.5 py-1',
  xs: 'px-2 py-1.5',
  sm: 'px-2.5 py-2',
  md: 'px-3 py-2.5',
  lg: 'px-3.5 py-3',
  xl: 'px-4 py-3.5',
};

/**
 * Textarea Component - For multi-line text input
 *
 * A customizable textarea component with optional auto-resize capability.
 * Integrated with form submission and supports dynamic row adjustment.
 *
 * @example
 * ```tsx
 * <Textarea name="message" placeholder="Enter message" rows={4} />
 * ```
 *
 * @example
 * ```tsx
 * <Textarea
 *   name="bio"
 *   placeholder="Tell us about yourself"
 *   rows={3}
 *   autoResize
 *   maxRows={8}
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Textarea",
 *   "name": "description",
 *   "placeholder": "Enter description",
 *   "rows": 4,
 *   "autoResize": true
 * }
 * ```
 */
export const Textarea: React.FC<TextareaProps> = ({
  name,
  defaultValue = '',
  required = false,
  placeholder,
  autoSelect = false,
  autoFocus = false,
  disabled = false,
  variant = 'outline',
  size = 'md',
  gutterSize,
  rows = 3,
  autoResize = false,
  maxRows,
  allowAutofillExtensions = false,
}) => {
  const textareaRef = useRef<TextAreaRef>(null);
  const [internalRows, setInternalRows] = useState(rows);

  const maxRowsValue = maxRows || Math.max(rows, 10);

  // Handle auto-select on mount
  useEffect(() => {
    if (autoSelect && textareaRef.current?.resizableTextArea?.textArea) {
      textareaRef.current.resizableTextArea.textArea.select();
    }
  }, [autoSelect]);

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;
  };

  // Handle blur
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {};

  return (
    <div data-w-component="textarea" data-variant={variant} data-size={size}>
      <Input.TextArea
        ref={textareaRef}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={internalRows}
        onChange={handleChange}
        onBlur={handleBlur}
        data-testid={`textarea-${name}`}
        data-lpignore={!allowAutofillExtensions}
        data-1p-ignore={!allowAutofillExtensions}
        aria-required={required}
        autoSize={autoResize ? true : { minRows: rows, maxRows: maxRowsValue }}
      />
    </div>
  );
};

export default Textarea;
