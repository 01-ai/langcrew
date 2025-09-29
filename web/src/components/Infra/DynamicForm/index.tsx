import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Select, Switch, InputNumber, DatePicker, message } from 'antd';
import { FormSchema, FormFieldSchema } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import FormField from './FormField';

const { TextArea } = Input;
const { Option } = Select;

interface DynamicFormRendererProps {
  schema: FormSchema;
  onSubmit: (data: any) => void;
  loading?: boolean;
  disabled?: boolean;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  schema,
  onSubmit,
  loading = false,
  disabled = true,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Initialize form data
  useEffect(() => {
    const initialData: Record<string, any> = {};
    Object.entries(schema.properties).forEach(([key, field]) => {
      if ((field as FormFieldSchema).default !== undefined) {
        initialData[key] = (field as FormFieldSchema).default;
      }
    });
    setFormData(initialData);
    form.setFieldsValue(initialData);
  }, [schema, form]);

  const handleSubmit = async () => {
    if (disabled) return;

    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error(t('form.error.checkInput'));
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const renderField = (fieldName: string, fieldSchema: FormFieldSchema) => {
    // Check if field is required: based on schema.required array or fieldSchema.required property
    const isRequired = schema.required?.includes(fieldName) || fieldSchema.required;

    // Use the title directly since models no longer generate titles with * marks
    const cleanTitle = fieldSchema.title;

    // Helper function to check if a property exists and is not null/undefined
    const hasProperty = (value: any) => value !== undefined && value !== null;

    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={cleanTitle}
        rules={[
          { required: isRequired, message: t('form.validation.required', { field: cleanTitle }) },
          // Only apply min/max length validation for string types
          ...(fieldSchema.type === 'string' && hasProperty(fieldSchema.minLength)
            ? [{ min: fieldSchema.minLength, message: t('form.validation.minLength', { min: fieldSchema.minLength }) }]
            : []),
          ...(fieldSchema.type === 'string' && hasProperty(fieldSchema.maxLength)
            ? [{ max: fieldSchema.maxLength, message: t('form.validation.maxLength', { max: fieldSchema.maxLength }) }]
            : []),
          ...(fieldSchema.type === 'number' && (hasProperty(fieldSchema.minimum) || hasProperty(fieldSchema.maximum))
            ? [
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null || value === '') {
                      return Promise.resolve();
                    }
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                      return Promise.reject(new Error(t('form.validation.validNumber')));
                    }
                    if (hasProperty(fieldSchema.minimum) && numValue < fieldSchema.minimum) {
                      return Promise.reject(new Error(t('form.validation.minValue', { min: fieldSchema.minimum })));
                    }
                    if (hasProperty(fieldSchema.maximum) && numValue > fieldSchema.maximum) {
                      return Promise.reject(new Error(t('form.validation.maxValue', { max: fieldSchema.maximum })));
                    }
                    return Promise.resolve();
                  },
                },
              ]
            : []),
          ...(hasProperty(fieldSchema.format) && fieldSchema.format === 'email'
            ? [{ type: 'email', message: t('form.validation.validEmail') }]
            : []),
          ...(hasProperty(fieldSchema.format) && fieldSchema.format === 'url'
            ? [{ type: 'url', message: t('form.validation.validUrl') }]
            : []),
          // Phone number validation
          ...(hasProperty(fieldSchema.format) && fieldSchema.format === 'phone'
            ? [
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null || value === '') {
                      return Promise.resolve();
                    }
                    // If custom regex is provided, use it
                    if (hasProperty(fieldSchema.pattern)) {
                      const regex = new RegExp(fieldSchema.pattern);
                      if (!regex.test(value)) {
                        return Promise.reject(new Error(t('form.validation.validPhone')));
                      }
                    } else {
                      // Use default Chinese phone number regex
                      const phoneRegex = /^1[3-9]\d{9}$/;
                      if (!phoneRegex.test(value)) {
                        return Promise.reject(new Error(t('form.validation.validPhone')));
                      }
                    }
                    return Promise.resolve();
                  },
                },
              ]
            : []),
          // Multi-select field validation
          ...(fieldSchema.type === 'multiselect' &&
          (hasProperty(fieldSchema.minSelections) || hasProperty(fieldSchema.maxSelections))
            ? [
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null) {
                      value = [];
                    }
                    if (!Array.isArray(value)) {
                      return Promise.reject(new Error(t('form.validation.validOptions')));
                    }
                    if (hasProperty(fieldSchema.minSelections) && value.length < fieldSchema.minSelections) {
                      return Promise.reject(
                        new Error(t('form.validation.minSelections', { min: fieldSchema.minSelections })),
                      );
                    }
                    if (hasProperty(fieldSchema.maxSelections) && value.length > fieldSchema.maxSelections) {
                      return Promise.reject(
                        new Error(t('form.validation.maxSelections', { max: fieldSchema.maxSelections })),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]
            : []),
        ]}
        tooltip={fieldSchema.description}
      >
        <FormField
          fieldSchema={fieldSchema}
          value={formData[fieldName]}
          onChange={(value) => handleFieldChange(fieldName, value)}
        />
      </Form.Item>
    );
  };

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      {schema.title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{schema.title}</h3>}
      {schema.description && <p className="text-sm text-gray-600 mb-6 leading-relaxed">{schema.description}</p>}

      <Form form={form} layout="vertical" className="space-y-4" onFinish={handleSubmit}>
        {Object.entries(schema.properties).map(([fieldName, fieldSchema]) =>
          renderField(fieldName, fieldSchema as FormFieldSchema),
        )}

        <Form.Item className="mt-8">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={disabled}
            className={`w-full h-12 text-base font-medium rounded-lg shadow-sm transition-all duration-200 `}
            size="large"
          >
            {loading ? t('form.submit.loading') : t('form.submit.button')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default DynamicFormRenderer;
export { DynamicFormRenderer };
