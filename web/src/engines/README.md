# JSON-to-JSX Widget Rendering Engine

A core engine that converts JSON configurations into React JSX components.

## Overview

This engine allows generating complete React component trees from simple JSON configurations or JSX strings. Supports both JSON and JSX formats for flexible dynamic UI generation.

## Core Features

- ✅ **Recursive JSON to JSX conversion** - Automatically convert nested JSON to React component trees
- ✅ **Component registration system** - Support registering custom components
- ✅ **Type safety** - Complete TypeScript support
- ✅ **Zero runtime overhead** - Converted to standard React components
- ✅ **Extensible** - Easily add new component types

## Usage

### Basic Usage

```typescript
import { renderWidget } from '@/engines/jsonToJsx';

const widgetData = {
  key: 'weather',
  type: 'Card',
  children: [
    {
      type: 'Text',
      value: 'Hello World',
      weight: 'semibold',
      size: 'lg',
    },
  ],
};

export function MyComponent() {
  const element = renderWidget(widgetData);
  return <div>{element}</div>;
}
```

### Generic Widget Data Rendering

```typescript
import { jsonToJsx } from '@/engines/jsonToJsx';

// Widget data from any source (message detail, props, etc.)
const widgetData = message.detail;

// Supports both direct widget data and wrapped format
const element = jsonToJsx(widgetData);
```

### Register Custom Components

```typescript
import { registerComponent } from '@/engines/jsonToJsx';
import MyCustomComponent from './MyCustomComponent';

// After registering, can use in JSON
registerComponent('MyComponent', MyCustomComponent);

const data = {
  type: 'MyComponent',
  customProp: 'value',
};
```

## Supported Component Types

| Component | Description       | Example                                             |
| --------- | ----------------- | --------------------------------------------------- |
| `Card`    | Root container    | `{ type: 'Card', padding: 5 }`                      |
| `Box`     | Generic container | `{ type: 'Box', gap: 2, padding: 3 }`               |
| `Row`     | Horizontal layout | `{ type: 'Row', align: 'center' }`                  |
| `Col`     | Vertical layout   | `{ type: 'Col', gap: 1 }`                           |
| `Text`    | Text              | `{ type: 'Text', value: 'Hello', size: 'lg' }`      |
| `Title`   | Title             | `{ type: 'Title', value: 'Title', weight: 'bold' }` |
| `Image`   | Image             | `{ type: 'Image', src: 'url', alt: 'desc' }`        |

## JSON Data Structure

### Container Component Properties

```typescript
interface ContainerProps {
  type: 'Card' | 'Box' | 'Row' | 'Col';

  // Layout
  gap?: number; // rem unit spacing
  padding?: number; // rem unit padding
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';

  // Size
  width?: number | string; // px or percentage
  minWidth?: number; // px
  maxWidth?: number; // px
  minHeight?: number; // px
  maxHeight?: number; // px

  // Style
  background?: 'surface-tertiary' | 'blue-100';
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

  // Content
  children?: WidgetComponent[];
}
```

### Text Component Properties

```typescript
interface TextProps {
  type: 'Text' | 'Title';
  value: string; // Text content
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'tertiary';
}
```

### Image Component Properties

```typescript
interface ImageProps {
  type: 'Image';
  src: string; // Image URL
  alt: string; // Alternative text
  fit?: 'contain' | 'cover' | 'fill';
  size?: number; // px
}
```

## Example: Weather Card

```json
{
  "type": "Card",
  "children": [
    {
      "type": "Box",
      "padding": 5,
      "background": "surface-tertiary",
      "children": [
        {
          "type": "Row",
          "align": "center",
          "justify": "between",
          "children": [
            {
              "type": "Col",
              "gap": 1,
              "children": [
                {
                  "type": "Text",
                  "value": "Paris",
                  "weight": "semibold",
                  "size": "lg"
                }
              ]
            },
            {
              "type": "Image",
              "src": "weather-icon.svg",
              "alt": "Sunny",
              "size": 28
            }
          ]
        }
      ]
    }
  ]
}
```

## Architecture

```
JSON Input
    ↓
jsonToJsx / renderWidget
    ↓
renderWidgetComponent (recursive)
    ↓
componentMap (query from registry)
    ↓
React.createElement
    ↓
JSX Element ✓
```

## Extension Guide

### Adding New Component Type

1. Create component file `src/components/widgets/MyComponent.tsx`
2. Export React component
3. Register in the engine:
   ```typescript
   import MyComponent from '@/components/widgets/MyComponent';
   registerComponent('MyComponent', MyComponent);
   ```

### Extend Type Definitions

Edit `src/types/widget.ts`:

```typescript
// Add new component type
export type ComponentType =
  | 'Card' | 'Box' | ...
  | 'MyComponent';  // ← New

// Define component properties
export interface MyComponentProps {
  type: 'MyComponent';
  customProp: string;
}

// Add to union type
export type WidgetComponent =
  | ...
  | MyComponentProps;  // ← New
```

## Color System

Define CSS variables in `src/components/widgets/widgets.css`:

```css
:root {
  --color-text-primary: #000000;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-surface-tertiary: #f5f5f5;
  --blue-100: #dbeafe;
}
```

Customize by modifying these variables.

## Performance Optimization

- Components use `React.createElement` for dynamic creation, support Memo wrapping
- Automatic key handling during recursion
- Registry lookup is O(1) operation

## Debugging

Enable development mode to view component tree:

```typescript
// Engine already has console.warn check for unregistered components
// Missing components will output warning:
// "Component type 'UnknownType' not registered"
```

## FAQ

**Q: How to modify styles?**
A: Modify CSS variables in `src/components/widgets/widgets.css` or style mappings in components.

**Q: How to add new colors?**
A: Extend `BackgroundColor` and `TextColor` types in types, add CSS variables, update color mappings.

**Q: Does it support responsive design?**
A: Currently basic support, can extend with media query support through component props.

## File Structure

```
src/
├── engines/
│   ├── jsonToJsx.ts           # Core rendering engine
│   ├── jsonToJsx.test.ts      # Tests
│   └── README.md              # This file
│
├── types/
│   └── widget.ts              # Complete type definitions
│
└── components/widgets/
    ├── Card.tsx               # Container components
    ├── Box.tsx
    ├── Row.tsx
    ├── Col.tsx
    ├── Text.tsx               # Text components
    ├── Title.tsx
    ├── Image.tsx              # Image components
    ├── widgets.css            # Styles
    └── index.ts               # Exports
```

## Contributing Guide

Contributions welcome! Please follow these steps:

1. Create a feature branch
2. Add TypeScript types
3. Implement components
4. Add test cases
5. Submit Pull Request

---

Last updated: 2025-10-31
