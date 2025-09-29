import React from 'react';
import { Input, Select, Switch, InputNumber, DatePicker, TimePicker, ColorPicker } from 'antd';
import { FormFieldSchema } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface FormFieldProps {
  fieldSchema: FormFieldSchema;
  value: any;
  onChange: (value: any) => void;
}

const FormField: React.FC<FormFieldProps> = ({ fieldSchema, value, onChange }) => {
  const { t } = useTranslation();

  const handleChange = (newValue: any) => {
    onChange(newValue);
  };

  // Use the title directly since models no longer generate titles with * marks
  const cleanTitle = fieldSchema.title;

  // Helper function to check if a property exists and is not null/undefined
  const hasProperty = (value: any) => value !== undefined && value !== null;

  switch (fieldSchema.type) {
    case 'string':
      if (fieldSchema.enum) {
        return (
          <Select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            value={value}
            onChange={handleChange}
            placeholder={t('form.placeholder.select', { field: cleanTitle })}
            allowClear
          >
            {fieldSchema.enum.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );
      }

      if (fieldSchema.format === 'date' || fieldSchema.format === 'date-time') {
        return (
          <DatePicker
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            value={value ? dayjs(value) : null}
            onChange={(date) =>
              handleChange(
                date ? date.format(fieldSchema.format === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss') : null,
              )
            }
            placeholder={t('form.placeholder.select', { field: cleanTitle })}
            showTime={fieldSchema.format === 'date-time'}
          />
        );
      }

      // Phone number format
      if (fieldSchema.format === 'phone') {
        return (
          <Input
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t('form.placeholder.input', { field: cleanTitle })}
            maxLength={hasProperty(fieldSchema.maxLength) ? fieldSchema.maxLength : undefined}
            showCount={hasProperty(fieldSchema.maxLength) ? true : false}
            type="tel"
          />
        );
      }

      if (fieldSchema.format === 'color') {
        return (
          <ColorPicker
            className="w-full"
            value={value}
            onChange={(color) => handleChange(color.toHexString())}
            showText
            size="large"
          />
        );
      }

      if (fieldSchema.format === 'time') {
        return (
          <TimePicker
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            value={value ? dayjs(value, 'HH:mm:ss') : null}
            onChange={(time) => handleChange(time ? time.format('HH:mm:ss') : null)}
            format="HH:mm:ss"
            placeholder={t('form.placeholder.select', { field: cleanTitle })}
          />
        );
      }

      // Use TextArea for long text
      if (hasProperty(fieldSchema.maxLength) && fieldSchema.maxLength > 100) {
        return (
          <TextArea
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t('form.placeholder.input', { field: cleanTitle })}
            rows={4}
            maxLength={hasProperty(fieldSchema.maxLength) ? fieldSchema.maxLength : undefined}
            showCount
          />
        );
      }

      return (
        <Input
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('form.placeholder.input', { field: cleanTitle })}
          maxLength={hasProperty(fieldSchema.maxLength) ? fieldSchema.maxLength : undefined}
          showCount={hasProperty(fieldSchema.maxLength) ? true : false}
        />
      );

    case 'number':
      return (
        <InputNumber
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          value={value}
          onChange={handleChange}
          placeholder={t('form.placeholder.input', { field: cleanTitle })}
          min={hasProperty(fieldSchema.minimum) ? fieldSchema.minimum : undefined}
          max={hasProperty(fieldSchema.maximum) ? fieldSchema.maximum : undefined}
          precision={hasProperty(fieldSchema.format) && fieldSchema.format === 'currency' ? 2 : undefined}
        />
      );

    case 'boolean':
      return (
        <Switch
          className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          checked={value}
          onChange={handleChange}
          checkedChildren={t('form.switch.yes')}
          unCheckedChildren={t('form.switch.no')}
        />
      );

    case 'array':
      // Check if there are items and enum, use multi-select if available
      if (hasProperty(fieldSchema.items) && hasProperty(fieldSchema.items.enum)) {
        return (
          <Select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            mode="multiple"
            value={Array.isArray(value) ? value : []}
            onChange={handleChange}
            placeholder={t('form.placeholder.select', { field: cleanTitle })}
            allowClear
          >
            {fieldSchema.items.enum.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );
      }

      // Simple array input using comma separation
      return (
        <TextArea
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => {
            const arrayValue = e.target.value
              .split(',')
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
            handleChange(arrayValue);
          }}
          placeholder={t('form.placeholder.input.comma', { field: cleanTitle })}
          rows={3}
        />
      );

    case 'multiselect':
      // Multi-select field using Select's multiple mode
      if (hasProperty(fieldSchema.enum)) {
        return (
          <Select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            mode="multiple"
            value={Array.isArray(value) ? value : []}
            onChange={handleChange}
            placeholder={t('form.placeholder.select', { field: cleanTitle })}
            allowClear
            maxTagCount="responsive"
          >
            {fieldSchema.enum.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );
      }
      // If no enum options, fallback to regular text input
      return (
        <Input
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => {
            const arrayValue = e.target.value
              .split(',')
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
            handleChange(arrayValue);
          }}
          placeholder={t('form.placeholder.input.comma', { field: cleanTitle })}
        />
      );

    case 'object':
      // Object type uses JSON editor
      return (
        <TextArea
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none font-mono text-sm"
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
          onChange={(e) => {
            try {
              const objValue = JSON.parse(e.target.value);
              handleChange(objValue);
            } catch {
              // If parsing fails, keep the original string
              handleChange(e.target.value);
            }
          }}
          placeholder={t('form.placeholder.json', { field: fieldSchema.title || 'field' })}
          rows={6}
        />
      );

    default:
      return (
        <Input
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('form.placeholder.input', { field: cleanTitle })}
        />
      );
  }
};

export default FormField;
