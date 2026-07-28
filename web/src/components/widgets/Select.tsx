import React, { useEffect, useMemo, useState } from 'react';
import type { ControlVariant, ControlSize } from '@/types';
import { Select as AntdSelect } from 'antd';
import './Select.css';
import { ActionConfig } from './types';
import { useActionExecutor } from '@/hooks/useActionExecutor';

/**
 * Select option object
 */
export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * Select component props
 */
export interface SelectProps {
  /**
   * The name of the form control field (required)
   * When the form is submitted, the value will be included in onSubmitAction payload
   * Supports dot-separated paths: "myData.myFieldName" → payload.myData.myFieldName
   */
  name: string;

  /**
   * List of selectable options (required)
   * Each option has label, value, and optional disabled flag
   * @example options={[{ label: "Option A", value: "a" }, { label: "Option B", value: "b" }]}
   */
  options: SelectOption[];

  /**
   * Action dispatched when the value changes
   * @example onChangeAction={{ type: 'selectionChanged', payload: { field: 'choice' } }}
   */
  onChangeAction?: ActionConfig;

  /**
   * Placeholder text shown when no value is selected
   * @example placeholder="Choose an option"
   */
  placeholder?: string;

  /**
   * Initial value of the select
   * @example defaultValue="option-a"
   */
  defaultValue?: string;

  /**
   * Visual variant of the select control
   * @default "outline"
   */
  variant?: ControlVariant;

  /**
   * Controls the size of the select
   * @default "md"
   */
  size?: ControlSize;

  /**
   * Determines if the select should be a fully rounded pill shape
   * @default false
   */
  pill?: boolean;

  /**
   * Extends select to 100% of available width
   * @default false
   */
  block?: boolean;

  /**
   * Show a clear control to unset the value
   * @default false
   */
  clearable?: boolean;

  /**
   * Disable interactions and apply disabled styles
   * @default false
   */
  disabled?: boolean;

  /**
   * Callback fired when value changes
   */
  onChange?: (value: string) => void;
}

/**
 * Select Component - For selecting from a list of options
 *
 * A customizable dropdown select component with support for custom options,
 * various visual styles, and form integration.
 *
 * @example
 * ```tsx
 * <Select
 *   name="choice"
 *   options={[{ label: "A", value: "a" }]}
 *   placeholder="Choose an option"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <Select
 *   name="status"
 *   options={[
 *     { label: "Active", value: "active" },
 *     { label: "Inactive", value: "inactive" }
 *   ]}
 *   defaultValue="active"
 *   variant="solid"
 *   size="lg"
 *   clearable
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Select",
 *   "name": "choice",
 *   "options": [{ "label": "A", "value": "a" }],
 *   "placeholder": "Choose an option",
 *   "variant": "outline",
 *   "size": "md"
 * }
 * ```
 */
export const Select: React.FC<SelectProps> = ({
  name,
  options,
  onChangeAction,
  placeholder = 'Select...',
  defaultValue,
  variant = 'outline',
  size = 'md',
  pill = false,
  block = false,
  clearable = false,
  disabled = false,

  onChange,
}) => {
  const [value, setValue] = useState<string | undefined>(defaultValue);
  const { executeAction } = useActionExecutor();

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  // Handle value change
  const handleValueChange = (newValue: string | undefined) => {
    setValue(newValue);

    if (onChange) {
      onChange(newValue ?? '');
    }

    executeAction(onChangeAction, {
      payload: {
        value: newValue,
        fieldName: name,
      },
    });
  };

  // Find selected option for display
  // const selectedOption = useMemo(() => options.find((opt) => opt.value === value), [value, options]);
  return (
    <div
      data-w-component="select"
      data-variant={variant}
      data-size={size}
      {...(pill && { 'data-pill': '' })}
      {...(disabled && { 'data-disabled': '' })}
      data-clearable={clearable}
    >
      <input type="hidden" name={name} value={value ?? ''} />
      <AntdSelect
        value={value || undefined}
        onChange={(newValue) => handleValueChange(newValue as string | undefined)}
        disabled={disabled}
        options={options}
        className="w-full"
        placeholder={placeholder}
        variant="borderless"
        allowClear={clearable}
      />
    </div>
  );
};

export default Select;
