import React, { useMemo, useState } from 'react';
import { Checkbox as AntdCheckbox, CheckboxChangeEvent } from 'antd';
import { ActionConfig } from './types';
import { useActionExecutor } from '@/hooks/useActionExecutor';

/**
 * Checkbox component props
 */
export interface CheckboxProps {
  /**
   * The name of the form control field (required)
   * When the form is submitted, the value will be included in onSubmitAction payload
   * Supports dot-separated paths: "myData.myFieldName" → payload.myData.myFieldName
   */
  name: string;

  /**
   * Optional label text rendered next to the checkbox
   * @example label="I agree to the terms"
   */
  label?: string;

  /**
   * The initial checked state of the checkbox
   * @default false
   */
  defaultChecked?: boolean;

  /**
   * Action dispatched when the checked state changes
   * @example onChangeAction={{ type: 'checkboxChanged', payload: { field: 'accept' } }}
   */
  onChangeAction?: ActionConfig;

  /**
   * Disable interactions and apply disabled styles
   * @default false
   */
  disabled?: boolean;

  /**
   * Mark the checkbox as required for form submission
   * @default false
   */
  required?: boolean;
}

/**
 * Checkbox Component - For binary selection
 *
 * A customizable checkbox component for toggling binary states with optional labels.
 * Integrated with form submission and supports various styling options.
 *
 * @example
 * ```tsx
 * <Checkbox name="subscribe" label="Subscribe to updates" />
 * ```
 *
 * @example
 * ```tsx
 * <Checkbox
 *   name="accept"
 *   label="I agree to the terms"
 *   required
 *   defaultChecked={false}
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Checkbox",
 *   "name": "newsletter",
 *   "label": "Sign up for newsletter",
 *   "defaultChecked": false
 * }
 * ```
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  name,
  label,
  defaultChecked = false,
  onChangeAction,
  disabled = false,
  required = false,
}) => {
  const [checked, setChecked] = useState(defaultChecked);
  const { executeAction } = useActionExecutor();

  // Handle check change
  const handleCheckedChange = (e: CheckboxChangeEvent) => {
    const newChecked = e.target.checked;
    setChecked(newChecked);

    executeAction(onChangeAction, {
      payload: {
        checked: newChecked,
        fieldName: name,
      },
      event: e.nativeEvent,
    });
  };

  return (
    <div data-w-component="checkbox">
      <AntdCheckbox
        name={name}
        defaultChecked={defaultChecked}
        onChange={handleCheckedChange}
        disabled={disabled}
        required={required}
      >
        {label}
      </AntdCheckbox>
    </div>
  );
};

export default Checkbox;
