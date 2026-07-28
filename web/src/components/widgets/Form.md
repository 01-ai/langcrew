# Form Component

## Overview

The `Form` component provides a flexible layout container optimized for organizing form controls and handling form submission. Built with flexbox support for responsive layouts.

## Basic Usage

```tsx
<Form gap={2} onSubmitAction={{ type: 'submitForm' }}>
  <Input name="email" placeholder="Email" />
  <Button label="Submit" submit />
</Form>
```

## Props

### Required Props

| Prop       | Type     | Description                          |
| ---------- | -------- | ------------------------------------ |
| `children` | ReactNode | Child components to render in form   |

### Layout Props

| Prop      | Type                                                        | Default | Description                    |
| --------- | ----------------------------------------------------------- | ------- | ------------------------------ |
| `direction` | `"row" \| "col"`                                             | `"col"` | Flex direction                 |
| `align`   | `"start" \| "center" \| "end" \| "baseline" \| "stretch"`   | -       | Cross-axis alignment           |
| `justify` | `"start" \| "center" \| "end" \| "stretch" \| "between" \| "around" \| "evenly"` | - | Main-axis distribution |
| `wrap`    | `"nowrap" \| "wrap" \| "wrap-reverse"`                      | -       | Flex wrap behavior             |
| `flex`    | `string \| number`                                          | -       | Flex grow/shrink factor        |
| `gap`     | `string \| number`                                          | -       | Gap between children           |

### Spacing & Sizing Props

| Prop        | Type                              | Default | Description            |
| ----------- | --------------------------------- | ------- | ---------------------- |
| `padding`   | `string \| number \| PaddingConfig` | -       | Inner padding          |
| `margin`    | `string \| number \| MarginConfig`  | -       | Outer margin           |
| `height`    | `string \| number`                | -       | Explicit height (px)   |
| `width`     | `string \| number`                | -       | Explicit width (px)    |
| `size`      | `string \| number`                | -       | Width & height shorthand |
| `minHeight` | `string \| number`                | -       | Min height             |
| `minWidth`  | `string \| number`                | -       | Min width              |
| `minSize`   | `string \| number`                | -       | Min width & height     |
| `maxHeight` | `string \| number`                | -       | Max height             |
| `maxWidth`  | `string \| number`                | -       | Max width              |
| `maxSize`   | `string \| number`                | -       | Max width & height     |

### Styling Props

| Prop          | Type                      | Default | Description               |
| ------------- | ------------------------- | ------- | ------------------------- |
| `background`  | `string \| BackgroundConfig` | -       | Background color          |
| `border`      | `number \| BorderConfig`  | -       | Border styling            |
| `radius`      | `string`                  | -       | Border radius token       |
| `aspectRatio` | `string \| number`        | -       | Aspect ratio (e.g. 16/9)  |

### Form Props

| Prop              | Type          | Description                      |
| ----------------- | ------------- | -------------------------------- |
| `onSubmitAction`  | `FormAction`  | Action dispatched on form submit  |
| `onSubmit`        | `function`    | Callback with FormData           |
| `className`       | `string`      | Additional CSS classes          |
| `cssStyle`        | `CSSProperties` | Inline styles               |

## Examples

### Vertical Form

```tsx
<Form gap={3} padding={4}>
  <Input name="email" placeholder="Email" required />
  <Input name="password" inputType="password" placeholder="Password" required />
  <Checkbox name="remember" label="Remember me" />
  <Button label="Sign In" submit />
</Form>
```

### Horizontal Layout

```tsx
<Form direction="row" gap={2} align="center">
  <Input name="search" placeholder="Search..." />
  <Button label="Search" submit />
</Form>
```

### With Border and Background

```tsx
<Form
  gap={2}
  padding={4}
  border={1}
  background="surface"
  radius="lg"
>
  <Input name="name" placeholder="Name" />
  <Textarea name="message" placeholder="Message" rows={4} />
  <Button label="Submit" submit />
</Form>
```

### Nested Layout

```tsx
<Form direction="col" gap={3} padding={4}>
  <Input name="email" placeholder="Email" />
  <Form direction="row" gap={2}>
    <Input name="firstName" placeholder="First" />
    <Input name="lastName" placeholder="Last" />
  </Form>
  <Button label="Continue" submit />
</Form>
```

### Responsive with Wrap

```tsx
<Form direction="row" wrap="wrap" gap={2} justify="between">
  <Input name="field1" placeholder="Field 1" />
  <Input name="field2" placeholder="Field 2" />
  <Button label="Submit" submit />
</Form>
```

## JSON Configuration

```json
{
  "type": "Form",
  "direction": "col",
  "gap": 2,
  "padding": 4,
  "onSubmitAction": { "type": "submitForm" },
  "children": [...]
}
```

## Form Submission

The Form component automatically:
- Collects form data from child form controls
- Supports nested field names (dot notation)
- Dispatches onSubmitAction with form data
- Prevents default form submission

## Accessing Form Data

Form data is collected with dot-notation support for nested fields:

```tsx
<Form onSubmitAction={{ type: 'submit' }}>
  <Input name="user.email" placeholder="Email" />
  <Input name="user.name" placeholder="Name" />
</Form>

// onSubmitAction payload:
// {
//   formData: {
//     user: {
//       email: "...",
//       name: "..."
//     }
//   }
// }
```

## Accessibility

- Semantic HTML form element
- Proper label association with inputs
- Keyboard navigation support
- Screen reader friendly
