import React, { useRef, useEffect, useState } from 'react';

import './input.css';

/**
 * Input action object
 */
export interface InputAction {
  type: string;
  payload?: unknown;
}

/**
 * Input component props
 */
export interface InputProps {
  /**
   * The name of the form control field (required)
   * When the form is submitted, the value will be included in onSubmitAction payload
   * Supports dot-separated paths: "myData.myFieldName" → payload.myData.myFieldName
   */
  name: string;

  /**
   * Native input type
   * @default "text"
   */
  inputType?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';

  /**
   * Initial value of the input
   */
  defaultValue?: string;

  /**
   * Visual style of the input
   * @default "outline"
   */
  variant?: 'soft' | 'outline';

  /**
   * Controls the size of the input
   * @default "md"
   * Size to height mapping:
   * | Size | Height |
   * |------|--------|
   * | 3xs  | 22px   |
   * | 2xs  | 24px   |
   * | xs   | 26px   |
   * | sm   | 28px   |
   * | md   | 32px   |
   * | lg   | 36px   |
   * | xl   | 40px   |
   * | 2xl  | 44px   |
   * | 3xl  | 48px   |
   */
  size?: '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

  /**
   * Controls gutter on the edges of the input
   * Defaults to value from size
   * | Size | Gutter |
   * |------|--------|
   * | 2xs  | 6px    |
   * | xs   | 8px    |
   * | sm   | 10px   |
   * | md   | 12px   |
   * | lg   | 14px   |
   * | xl   | 16px   |
   */
  gutterSize?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Mark the input as required for form submission
   * @default false
   */
  required?: boolean;

  /**
   * Regex pattern for input validation
   */
  pattern?: string;

  /**
   * Placeholder text shown when empty
   */
  placeholder?: string;

  /**
   * Allow password managers / autofill extensions to appear
   * Defaults to true for password type
   */
  allowAutofillExtensions?: boolean;

  /**
   * Select all contents of the input when it mounts
   * @default false
   */
  autoSelect?: boolean;

  /**
   * Autofocus the input when it mounts
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Disable interactions and apply disabled styles
   * @default false
   */
  disabled?: boolean;

  /**
   * Determines if the input should be a fully rounded pill shape
   * @default false
   */
  pill?: boolean;

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
 * Input Component - For single-line text input
 *
 * A customizable text input component supporting various types, sizes, and styles.
 * Integrated with form submission and supports validation patterns.
 *
 * @example
 * ```tsx
 * <Input name="email" inputType="email" placeholder="you@example.com" />
 * ```
 *
 * @example
 * ```tsx
 * <Input
 *   name="password"
 *   inputType="password"
 *   placeholder="Enter password"
 *   required
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Input",
 *   "name": "email",
 *   "inputType": "email",
 *   "placeholder": "Enter email",
 *   "size": "md"
 * }
 * ```
 */
export const Input: React.FC<InputProps> = ({
  name,
  inputType = 'text',
  defaultValue = '',
  variant = 'outline',
  size = 'md',
  gutterSize,
  required = false,
  pattern,
  placeholder,
  allowAutofillExtensions,
  autoSelect = false,
  autoFocus = false,
  disabled = false,
  pill = false,
  className = '',
  cssStyle,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [focused, setFocused] = useState(false);

  // Handle auto-select on mount
  useEffect(() => {
    if (autoSelect && inputRef.current) {
      inputRef.current.select();
    }
  }, [autoSelect]);

  // Determine if autofill should be allowed
  const shouldAllowAutofill =
    allowAutofillExtensions !== undefined ? allowAutofillExtensions : inputType === 'password';

  // Handle blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
  };

  // Handle focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
  };

  return (
    <div
      data-w-component="input"
      data-variant={variant}
      data-size={size}
      style={cssStyle}
      data-focused={focused}
      data-gutter-size={gutterSize || size}
      {...(pill && { 'data-pill': '' })}
      {...(disabled && { 'data-disabled': '' })}
      className={className}
    >
      <input
        ref={inputRef}
        type={inputType}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        pattern={pattern}
        disabled={disabled}
        autoFocus={autoFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-testid={`input-${name}`}
        data-lpignore={!shouldAllowAutofill}
        data-1p-ignore={!shouldAllowAutofill}
        aria-required={required}
        className={className}
      />
    </div>
  );
};

export default Input;
