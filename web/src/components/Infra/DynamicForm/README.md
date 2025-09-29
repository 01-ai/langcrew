# DynamicForm Component

A dynamic form component based on Ant Design that automatically renders forms based on JSON Schema.

## Features

- 🎯 Automatically renders forms based on JSON Schema
- 📝 Supports multiple field types: string, number, boolean, array, object
- ✅ Built-in form validation
- 🎨 Beautiful UI design
- 📱 Responsive layout
- 🔧 Supports custom field configuration

## Usage

```tsx
import { DynamicFormRenderer } from '@/components/Infra/DynamicForm';

const schema = {
  type: 'object',
  title: 'User Information',
  description: 'Please fill in your personal information',
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
      required: true,
    },
    age: {
      type: 'number',
      title: 'Age',
      minimum: 0,
      maximum: 120,
    },
    gender: {
      type: 'string',
      title: 'Gender',
      enum: ['Male', 'Female', 'Other'],
    },
    isActive: {
      type: 'boolean',
      title: 'Is Active',
      default: true,
    },
  },
  required: ['name', 'email'],
};

const handleSubmit = (data) => {
  console.log('Form data:', data);
};

<DynamicFormRenderer schema={schema} onSubmit={handleSubmit} loading={false} />;
```

## Supported Field Types

### String Type

- Regular text input
- Email format validation
- URL format validation
- Date picker
- Long text area
- Dropdown selection (enum)

### Number Type

- Number input
- Min/max value constraints
- Currency format

### Boolean Type

- Switch component

### Array Type

- Comma-separated text input

### Object Type

- JSON editor

## Props

| Property | Type                | Required | Description                                 |
| -------- | ------------------- | -------- | ------------------------------------------- |
| schema   | FormSchema          | Yes      | JSON Schema configuration for the form      |
| onSubmit | (data: any) => void | Yes      | Form submission callback function           |
| loading  | boolean             | No       | Whether to show loading state               |
| disabled | boolean             | No       | Whether to disable the form (default: true) |

## Style Customization

The component uses Tailwind CSS for styling, with all styles being inline Tailwind class names that can be adjusted as needed. Main styles include:

- Container: White background, rounded borders, shadow effects
- Form fields: Unified input styles, focus effects, transition animations
- Button: Hover effects, click animations, shadow changes
