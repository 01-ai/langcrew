import React, { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import type { ControlVariant, ControlSize } from '@/types';
import { DatePicker as AntdDatePicker } from 'antd';
import './DatePicker.css';
import { ActionConfig } from './types';
import { useActionExecutor } from '@/hooks/useActionExecutor';

/**
 * DatePicker component props
 */
export interface DatePickerProps {
  /**
   * The name of the form control field (required)
   * When the form is submitted, the value will be included in onSubmitAction payload
   * Supports dot-separated paths: "myData.myFieldName" → payload.myData.myFieldName
   */
  name: string;

  /**
   * Action dispatched when the date value changes
   * @example onChangeAction={{ type: 'dateChanged', payload: { date: '2024-01-31' } }}
   */
  onChangeAction?: ActionConfig;

  /**
   * Placeholder text shown when no date is selected
   * @example placeholder="YYYY-MM-DD"
   */
  placeholder?: string;

  /**
   * Initial ISO date string
   * @example defaultValue="2024-01-31"
   */
  defaultValue?: string;

  /**
   * Earliest selectable ISO date (inclusive)
   * @example min="2024-01-01"
   */
  min?: string;

  /**
   * Latest selectable ISO date (inclusive)
   * @example max="2024-12-31"
   */
  max?: string;

  /**
   * Visual variant of the datepicker control
   * @default "outline"
   */
  variant?: ControlVariant;

  /**
   * Controls the size of the datepicker
   * @default "md"
   */
  size?: ControlSize;

  /**
   * Preferred side to render the calendar
   */
  side?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Preferred alignment of the calendar relative to the datepicker control
   * @default "center"
   */
  align?: 'start' | 'center' | 'end';

  /**
   * Determines if the datepicker should be a fully rounded pill shape
   * @default false
   */
  pill?: boolean;

  /**
   * Extends datepicker to 100% of available width
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
   * Additional CSS class names
   * Merged with generated classes
   */
  className?: string;

  /**
   * Inline CSS styles
   * Applied after CSS-in-JS styles
   */
  cssStyle?: React.CSSProperties;

  /**
   * Callback fired when date changes
   */
  onChange?: (date: Dayjs | null, dateString: string) => void;
}

/**
 * Parse ISO date string into Dayjs
 */
const parseIsoDate = (value?: string): Dayjs | undefined => {
  if (!value) return undefined;
  return dayjs(value);
};

/**
 * DatePicker Component - For selecting dates from a calendar
 *
 * A customizable date picker component with support for date range constraints,
 * various visual styles, and form integration.
 *
 * @example
 * ```tsx
 * <DatePicker name="birthday" placeholder="YYYY-MM-DD" />
 * ```
 *
 * @example
 * ```tsx
 * <DatePicker
 *   name="startDate"
 *   defaultValue="2024-01-31"
 *   min="2024-01-01"
 *   max="2024-12-31"
 *   variant="outline"
 *   size="md"
 *   clearable
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "DatePicker",
 *   "name": "birthday",
 *   "placeholder": "Pick a date",
 *   "variant": "outline",
 *   "size": "md",
 *   "clearable": true
 * }
 * ```
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  name,
  onChangeAction,
  placeholder = 'Pick a date',
  defaultValue,
  min,
  max,
  variant = 'outline',
  size = 'md',
  side,
  align = 'center',
  pill = false,
  block = false,
  clearable = false,
  disabled = false,
  className = '',
  cssStyle,
  onChange,
}) => {
  const [value, setValue] = useState<Dayjs | undefined>(defaultValue ? dayjs(defaultValue) : undefined);
  const { executeAction } = useActionExecutor();

  // Convert min/max to Dayjs objects
  const minDate = useMemo(() => parseIsoDate(min), [min]);
  const maxDate = useMemo(() => parseIsoDate(max), [max]);

  const handleSelect = (date: Dayjs | null, dateString: string) => {
    setValue(date ?? undefined);
    onChange?.(date ?? undefined, dateString);
    executeAction(onChangeAction, {
      payload: {
        value: dateString || null,
        isoValue: date?.toISOString?.(),
        fieldName: name,
        isCleared: !dateString,
      },
    });
  };

  return (
    <div
      data-w-component="date-picker"
      data-variant={variant}
      data-size={size}
      {...(pill && { 'data-pill': '' })}
      {...(disabled && { 'data-disabled': '' })}
    >
      <AntdDatePicker<Dayjs>
        name={name}
        className="w-full"
        placeholder={placeholder}
        defaultValue={defaultValue ? dayjs(defaultValue) : undefined}
        value={value}
        onChange={handleSelect}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        allowClear={clearable}
      />
    </div>
  );
};

export default DatePicker;
