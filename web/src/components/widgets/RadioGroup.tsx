import React, { useMemo, useState } from 'react';
import { Radio as AntdRadio, RadioChangeEvent } from 'antd';
import { ActionConfig } from './types';
import { useActionExecutor } from '@/hooks/useActionExecutor';

const AntdRadioGroup = AntdRadio.Group;

/**
 * Radio option object
 */
export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * RadioGroup component props
 */
export interface RadioGroupProps {
  /**
   * The name of the form control field (required)
   * When the form is submitted, the value will be included in onSubmitAction payload
   * Supports dot-separated paths: "myData.myFieldName" → payload.myData.myFieldName
   */
  name: string;

  /**
   * Array of options to render as radio items (required)
   * Each option has label, value, and optional disabled flag
   * @example options={[{ label: "Small", value: "sm" }, { label: "Large", value: "lg" }]}
   */
  options: RadioOption[];

  /**
   * Accessible label for the radio group; falls back to name
   * @example ariaLabel="Select a size"
   */
  ariaLabel?: string;

  /**
   * Action dispatched when the selected value changes
   * @example onChangeAction={{ type: 'sizeSelected', payload: { category: 'size' } }}
   */
  onChangeAction?: ActionConfig;

  /**
   * Initial selected value of the radio group
   * @example defaultValue="md"
   */
  defaultValue?: string;

  /**
   * Layout direction of the radio items
   * @default "row"
   */
  direction?: 'row' | 'col';

  /**
   * Disable interactions and apply disabled styles for the entire group
   * @default false
   */
  disabled?: boolean;

  /**
   * Mark the group as required for form submission
   * @default false
   */
  required?: boolean;
}

/**
 * RadioGroup Component - For single option selection
 *
 * A customizable radio group component for selecting a single option from multiple choices.
 * Integrated with form submission and supports various layout directions.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   name="size"
 *   options={[
 *     { label: "Small", value: "sm" },
 *     { label: "Medium", value: "md" },
 *     { label: "Large", value: "lg" }
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   name="plan"
 *   options={[
 *     { label: "Basic", value: "basic" },
 *     { label: "Pro", value: "pro" },
 *     { label: "Enterprise", value: "enterprise" }
 *   ]}
 *   direction="col"
 *   defaultValue="basic"
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "RadioGroup",
 *   "name": "size",
 *   "options": [
 *     { "label": "Small", "value": "sm" },
 *     { "label": "Large", "value": "lg" }
 *   ],
 *   "direction": "row"
 * }
 * ```
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  ariaLabel,
  onChangeAction,
  defaultValue = '',
  direction = 'row',
  disabled = false,
  required = false,
}) => {
  const [value, setValue] = useState(defaultValue);
  const { executeAction } = useActionExecutor();

  // Handle value change
  const handleValueChange = (e: RadioChangeEvent) => {
    const newValue = e.target.value;
    setValue(newValue);

    executeAction(onChangeAction, {
      payload: {
        value: newValue,
        fieldName: name,
      },
      event: e.nativeEvent,
    });
  };

  return (
    <div data-w-component="radio-group">
      <AntdRadioGroup
        name={name}
        defaultValue={defaultValue}
        onChange={handleValueChange}
        disabled={disabled}
        aria-label={ariaLabel || name}
        options={options}
      />
    </div>
  );
};

export default RadioGroup;
