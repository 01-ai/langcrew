# Button Component Guide

The widget `Button` triggers an `ActionConfig` or submits the nearest widget form. It supports labels, Lucide icons, color tokens, visual variants, size presets, and loading state.

## Basic Usage

```tsx
<Button
  label="Download"
  iconStart="download"
  color="primary"
  variant="solid"
  size="lg"
  onClickAction={{
    type: 'download_file',
    payload: { url: '/example.pdf' },
  }}
/>
```

A non-submit button without `onClickAction` is disabled automatically.

## Props

| Prop | Default | Description |
| --- | --- | --- |
| `label` | - | Text shown in the button |
| `onClickAction` | - | Action executed on click |
| `submit` | `false` | Uses `type="submit"` for the nearest form |
| `iconStart` | - | Icon before the label |
| `iconEnd` | - | Icon after the label |
| `iconSize` | `md` | Icon size token |
| `color` | `primary` | Button color token |
| `variant` | `solid` | Visual variant token |
| `style` | - | `primary` or `secondary` convenience preset |
| `size` | `lg` | Overall size token |
| `pill` | `true` | Enables the fully rounded shape |
| `uniform` | `false` | Makes width equal to height |
| `block` | `false` | Expands to the available width |
| `disabled` | `false` | Disables interaction |
| `collectFormData` | `true` | Merges widget form data into the action payload |

Supported size tokens are `3xs`, `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, and `3xl`.

## Icon-Only Button

```tsx
<Button
  iconStart="plus"
  uniform
  pill
  onClickAction={{ type: 'add_item' }}
/>
```

## Form Submission

```tsx
<Button label="Submit" submit />
```

When both `submit` and `onClickAction` are provided, the action executor handles the click and prevents duplicate native submission.

## Widget JSON

```json
{
  "type": "Button",
  "label": "Continue",
  "color": "primary",
  "variant": "solid",
  "size": "lg",
  "onClickAction": {
    "type": "continue"
  }
}
```

The component exposes `data-color`, `data-variant`, `data-size`, `data-pill`, `data-uniform`, and `data-block` attributes consumed by `button.css`.
