# Message Type Registry

`src/registry` maps Agent message types to React renderers. A message type may
provide a brief renderer for the conversation, a detail renderer for the
workspace, and an icon. Unregistered types use the default renderers.

## Core Types

```typescript
export interface MessageTypeConfig {
  type: MessageTypeMatcher;
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  icon?: React.ComponentType<CustomIconComponentProps>;
}

export interface BriefRendererProps {
  message: MessageChunk;
  withIcon?: boolean;
  hasUserInput?: boolean;
}

export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}
```

`MessageTypeMatcher` supports an exact string, an array of strings, or a regular
expression. Exact matches have priority over array and regular-expression
matches.

```typescript
registry.registerMessageType({
  type: 'text',
  briefRenderer: TextBriefRenderer,
});

registry.registerMessageType({
  type: ['file_read', 'file_write', 'file_delete'],
  briefRenderer: FileOperationBrief,
  detailRenderer: FileOperationDetail,
});

registry.registerMessageType({
  type: /^browser_/,
  briefRenderer: BrowserToolBrief,
  detailRenderer: BrowserToolDetail,
  icon: BrowserIcon,
});
```

## Layout

```text
src/registry/
|-- index.ts              Registry implementation and public types
|-- builtin.ts            Built-in registration entry point
|-- common/               Shared renderers, hooks, and icons
|-- default/              Fallback brief and detail renderers
|-- browser/              Browser tools
|-- file_*/               File operations
|-- finish_reason/        Completion messages
|-- image_*/              Image tools
|-- live_status/          Streaming status messages
|-- mysql/                SQL tools
|-- phone/                Cloud phone tools
|-- plan/                 Plan messages
|-- user_input/           Human-in-the-loop input
`-- web_search/           Web search tools
```

## Register A Type

Create a renderer in a dedicated directory:

```typescript
// src/registry/new_type/NewTypeBriefRenderer.tsx
import React from 'react';
import type { BriefRendererProps } from '..';

const NewTypeBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => (
  <div>New message: {message.content}</div>
);

export default NewTypeBriefRenderer;
```

Register it from the directory entry point:

```typescript
// src/registry/new_type/index.ts
import registry from '..';
import NewTypeBriefRenderer from './NewTypeBriefRenderer';

registry.registerMessageType({
  type: 'new_type',
  briefRenderer: NewTypeBriefRenderer,
});
```

Finally, import the entry point from `builtin.ts`:

```typescript
import './new_type';
```

## Rendering

```typescript
const BriefRenderer = registry.getBriefRenderer(message.type);
const DetailRenderer = registry.getDetailRenderer(message.type);
const ToolIcon = registry.getToolIcon(message.type);
```

`getBriefRenderer` and `getDetailRenderer` return configured fallbacks when a
type does not define its own renderer. Tool renderers can use
`common/useToolContent` to normalize tool output.

## Conventions

- Keep each message type in its own directory.
- Use typed props for type-specific message fields.
- Keep renderers free of unrelated side effects.
- Use the existing translation helpers for user-facing text.
- Add unit coverage for registration and renderer selection.
