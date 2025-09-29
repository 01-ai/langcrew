# Registry message type registration system

## Overview

`src/registry` directory implements a flexible message type registration system, used to manage the rendering components of different types of messages. This system supports registering the left brief rendering component (BriefRenderer) and the right detail rendering component (DetailRenderer) for each message type, and provides a default rendering component as a fallback mechanism.

## Architecture design

### Core concepts

- **BriefRenderer**: the brief rendering component in the left message list
- **DetailRenderer**: the detail rendering component in the right detail area
- **MessageTypeRegistry**: the message type registration table, managing all registered rendering components
- **MessageTypeConfig**: the configuration interface for a single message type

### Type matching mechanism

The system supports three types of matching ways:

1. **String matching**: exact matching for specific message types
2. **Array matching**: multiple types use the same rendering component
3. **Regular matching**: dynamic type matching, support pattern matching

```typescript
// String matching
registry.registerMessageType({
  type: 'text',
  briefRenderer: TextBriefRenderer,
});

// Array matching
registry.registerMessageType({
  type: ['file_read', 'file_write', 'file_delete'],
  briefRenderer: FileOperationBrief,
  detailRenderer: FileOperationDetail,
});

// Regular matching
registry.registerMessageType({
  type: /^browser_/,
  briefRenderer: BrowserToolBrief,
  detailRenderer: BrowserToolDetail,
  icon: BrowserIcon,
});
```

## Directory structure

```
src/registry/
├── index.ts                    # main registration table and core interface definition
├── builtin.ts                  # builtin message type registration entry
├── default/                    # default rendering component
│   ├── DefaultBriefRenderer.tsx
│   └── DefaultDetailRenderer.tsx
├── common/                     # common component and tool
│   ├── icons.tsx               # tool icon component
│   ├── ToolBriefRenderer.tsx   # common tool brief renderer
│   ├── ErrorDetailRenderer.tsx
│   ├── ImageDetailRenderer.tsx
│   ├── MessageBrief.tsx
│   └── useToolContent.ts       # tool content processing Hook
├── text/                       # text message type
├── web_search/                 # web search type
├── code_interpreter/           # code interpreter type
├── file_*                      # file operation related type
├── image_*                     # image related type
├── browser/                    # browser tool type
├── phone/                      # phone tool type
├── mysql/                      # MySQL database type
├── error/                      # error message type
├── plan/                       # plan message type
├── live_status/                # real-time status type
├── user_input/                 # user input type
├── finish_reason/              # finish reason type
├── message_to_user/            # user notification type
├── knowledge_search/           # knowledge base search type
├── chunk_retrieval/            # chunk retrieval type
└── service_deploy/             # service deploy type
```

## Core interface

### MessageTypeConfig

```typescript
export interface MessageTypeConfig {
  type: MessageTypeMatcher; // support string, array or regular expression
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  icon?: React.ComponentType<CustomIconComponentProps>;
}
```

### BriefRendererProps

```typescript
export interface BriefRendererProps {
  message: MessageChunk;
  withIcon?: boolean;
  hasUserInput?: boolean;
}
```

### DetailRendererProps

```typescript
export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}
```

## Builtin message type

### Basic type

| Type          | Description       | BriefRenderer | DetailRenderer | Icon |
| ------------- | ---------- | ------------- | -------------- | ---- |
| `text`        | Pure text message | ✅            | ❌             | -    |
| `error`       | Error message   | ✅            | ❌             | -    |
| `live_status` | Real-time status   | ✅            | ❌             | -    |
| `plan`        | Plan message   | ✅            | ❌             | -    |

### Tool type

| Type               | Description         | BriefRenderer | DetailRenderer | Icon |
| ------------------ | ------------ | ------------- | -------------- | ---- |
| `web_search`       | Web search     | ❌            | ✅             | 🔍   |
| `code_interpreter` | Code interpreter   | ❌            | ✅             | 💻   |
| `browser/*`        | Browser tool   | ❌            | ✅             | 🌐   |
| `phone/*`          | Phone tool     | ❌            | ✅             | 📱   |
| `mysql/*`          | MySQL database | ❌            | ✅             | 🗄️   |

### File operation type

| Type                | Description         | BriefRenderer | DetailRenderer | Icon |
| ------------------- | ------------ | ------------- | -------------- | ---- |
| `write_file`        | Write file       | ❌            | ✅             | 📄   |
| `read_file`         | Read file       | ❌            | ✅             | 📄   |
| `file_read_text`    | Read text file | ❌            | ✅             | 📄   |
| `file_append_text`  | Append text     | ❌            | ✅             | 📄   |
| `file_replace_text` | Replace text     | ❌            | ✅             | 📄   |
| `file_parser`       | File parser     | ❌            | ✅             | 📄   |
| `delete_file`       | Delete file     | ❌            | ✅             | 🗑️   |

### Image related type

| Type               | Description     | BriefRenderer | DetailRenderer | Icon |
| ------------------ | -------- | ------------- | -------------- | ---- |
| `image_parser`     | Image parser | ❌            | ✅             | 🖼️   |
| `image_generation` | Image generation | ❌            | ✅             | 🎨   |

### Other type

| Type                  | Description       | BriefRenderer | DetailRenderer | Icon |
| --------------------- | ---------- | ------------- | -------------- | ---- |
| `run_command`         | Run command   | ❌            | ✅             | ⚡   |
| `service_deploy`      | Service deploy   | ❌            | ✅             | 🚀   |
| `knowledge_search`    | Knowledge search | ❌            | ✅             | 📚   |
| `chunk_retrieval`     | Chunk retrieval | ❌            | ✅             | 🔍   |
| `user_input`          | User input   | ✅            | ❌             | -    |
| `finish_reason`       | Finish reason   | ✅            | ❌             | -    |
| `message_to_user` | User notification   | ✅            | ❌             | -    |

## Usage guide

### 1. Register new message type

```typescript
// 1. Create rendering component
const CustomBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => (
  <div className="custom-brief">
    <span>Custom message: {message.content}</span>
  </div>
);

const CustomDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => (
  <div className="custom-detail">
    <h3>Detailed information</h3>
    <pre>{JSON.stringify(message.detail, null, 2)}</pre>
  </div>
);

// 2. Register message type
import registry from '@/registry';
import { ToolIconCustom } from '@/registry/common/icons';

registry.registerMessageType({
  type: 'custom_type',
  briefRenderer: CustomBriefRenderer,
  detailRenderer: CustomDetailRenderer,
  icon: ToolIconCustom,
});
```

### 2. Use in container component

```typescript
// Left message list rendering
const MessageList: React.FC<{ messages: MessageChunk[] }> = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((message, index) => {
        const BriefRenderer = registry.getBriefRenderer(message.type);
        return <BriefRenderer key={index} message={message} withIcon={true} />;
      })}
    </div>
  );
};

// Right detail area rendering
const MessageDetail: React.FC<{ message?: MessageChunk }> = ({ message }) => {
  if (!message) return null;

  const DetailRenderer = registry.getDetailRenderer(message.type);
  return (
    <div className="message-detail">
      <DetailRenderer message={message} isRealTime={false} />
    </div>
  );
};
```

### 3. Tool type special handling

```typescript
// Tool type message needs special handling
const ToolMessage: React.FC<{ message: MessageToolChunk }> = ({ message }) => {
  const ToolBriefRenderer = registry.getBriefRenderer(message.type);
  const ToolIcon = registry.getToolIcon(message.type);

  return (
    <div className="tool-message">
      <ToolIcon />
      <ToolBriefRenderer message={message} withIcon={false} />
    </div>
  );
};
```

## Common component

### ToolBriefRenderer

A generic tool brief renderer, used to display the basic information of tool type messages.

```typescript
import ToolBriefRenderer from '@/registry/common/ToolBriefRenderer';

// Usage example
<ToolBriefRenderer message={message} withIcon={true} />;
```

### useToolContent

A hook for extracting tool message content.

```typescript
import useToolContent from '@/registry/common/useToolContent';

const MyDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content } = useToolContent(message as MessageToolChunk);
  return <div>{content}</div>;
};
```

### Icon component

Predefined tool icon components, located in `common/icons.tsx`:

- `ToolIconDefault`: Default tool icon
- `ToolIconSearch`: Search icon
- `ToolIconCode`: Code icon
- `ToolIconFile`: File icon
- `ToolIconImage`: Image icon
- `ToolIconBrowser`: Browser icon
- `ToolIconPhone`: Phone icon
- `ToolIconCheck`: Check icon
- `ToolIconEmpty`: Empty status icon

## Best practices

### 1. File organization

```
src/registry/
├── my_type/
│   ├── index.ts                    # Registration logic
│   ├── MyTypeBriefRenderer.tsx     # Brief renderer
│   ├── MyTypeDetailRenderer.tsx    # Detail renderer
│   └── README.md                   # Documentation
```

### 2. Type safety

```typescript
// Define specific props interface for specific tool type
interface WebSearchBriefProps extends BriefRendererProps {
  message: MessageChunk & { type: 'web_search' };
}

const WebSearchBrief: React.FC<WebSearchBriefProps> = ({ message }) => {
  // Here the type of message is safe
  return <div>搜索: {message.query}</div>;
};
```

### 3. Error handling

```typescript
// Check if the message type is registered
const isRegistered = (type: string): boolean => {
  return !!registry.getMessageType(type);
};

// Get default value when getting renderer
const getRenderer = (type: string) => {
  try {
    return registry.getBriefRenderer(type);
  } catch (error) {
    console.warn(`Failed to get renderer for type: ${type}`, error);
    return registry.getBriefRenderer('text'); // Fallback to text renderer
  }
};
```

### 4. Performance optimization

```typescript
// Cache renderer component reference
const rendererCache = new Map<string, React.ComponentType<any>>();

const getCachedRenderer = (type: string) => {
  if (!rendererCache.has(type)) {
    rendererCache.set(type, registry.getBriefRenderer(type));
  }
  return rendererCache.get(type)!;
};
```

## Extension guide

### Add new message type

1. **Create directory structure**：

   ```bash
   mkdir -p src/registry/new_type
   ```

2. **Create rendering component**：

   ```typescript
   // src/registry/new_type/NewTypeBriefRenderer.tsx
   import React from 'react';
   import { BriefRendererProps } from '..';

   const NewTypeBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
     return <div>New type message: {message.content}</div>;
   };

   export default NewTypeBriefRenderer;
   ```

3. **Register message type**：

   ```typescript
   // src/registry/new_type/index.ts
   import registry from '..';
   import NewTypeBriefRenderer from './NewTypeBriefRenderer';

   registry.registerMessageType({
     type: 'new_type',
     briefRenderer: NewTypeBriefRenderer,
   });
   ```

4. **Add to builtin registration**：
   ```typescript
   // src/registry/builtin.ts
   import './new_type';
   ```

### Custom default rendering component

```typescript
// Replace default rendering component
registry.defaultBriefRenderer = CustomDefaultBriefRenderer;
registry.defaultDetailRenderer = CustomDefaultDetailRenderer;
registry.defaultIcon = CustomDefaultIcon;
```

## Debug and test

### Debug tool

```typescript
// Check registration status
const debugRegistry = () => {
  console.log('Registered types:', Array.from(registry.stringTypes.keys()));
  console.log('Pattern types:', registry.patternTypes.length);
  console.log('Array types:', registry.arrayTypes.length);
};

// Test type matching
const testTypeMatch = (type: string) => {
  const config = registry.getMessageType(type);
  console.log(`Type "${type}":`, config ? 'Found' : 'Not found');
  return config;
};
```

### 单元测试

```typescript
// Test registration and retrieval
describe('MessageTypeRegistry', () => {
  it('should register and retrieve message type', () => {
    const mockRenderer = () => <div>Test</div>;

    registry.registerMessageType({
      type: 'test_type',
      briefRenderer: mockRenderer,
    });

    const retrieved = registry.getBriefRenderer('test_type');
    expect(retrieved).toBe(mockRenderer);
  });
});
```

## Notes

1. **Type matching priority**：String matching > Array matching > Regular matching
2. **Component lifecycle**：Rendering component should be a pure function component, avoid side effects
3. **Performance consideration**：Consider using React.memo to optimize rendering when there are a lot of messages
4. **Error boundary**：Add error boundary handling to render exceptions in container components
5. **Internationalization**：Use `getTranslation` function to support multiple languages

## Update log

| Date       | Added type                          |
| ---------- | ----------------------------------- |
| 2025-06-24 | live_status (Real-time status)      |
| 2025-06-24 | plan (Plan)                         |
| 2025-06-30 | web_search (Web search)             |
| 2025-07-01 | run_command (Run command)           |
| 2025-07-01 | delete_file (Delete file)           |
| 2025-07-01 | file_read_text (Read file)           |
| 2025-07-01 | write_file (Write file)               |
| 2025-07-01 | file_append_text (Append text)         |
| 2025-07-01 | file_replace_text (Replace text)        |
| 2025-07-02 | browser_navigate_to (Navigate to)    |
| 2025-07-03 | browser_click_element (Click element)  |
| 2025-07-03 | browser_scroll (Scroll)         |
| 2025-07-03 | browser_go_back (Go back)        |
| 2025-07-03 | browser_send_keys (Send keys)  |
| 2025-07-03 | browser_input_text (Input text) |
| 2025-07-04 | browser_switch_tab (Switch tab) |
| 2025-07-04 | service_deploy (Service deploy)           |
| 2025-07-05 | code_interpreter (Code interpreter)       |
| 2025-07-05 | user_input (User input)               |
| 2025-07-07 | finish_reason (Finish reason)            |
| 2025-07-09 | file_parser (File parser)              |
| 2025-07-10 | message_to_user (User notification)  |
| 2025-07-14 | image_parser (Image parser)             |
| 2025-07-15 | image_generation (Image generation)         |
| 2025-07-18 | mysql (MySQL)                    |
| 2025-07-18 | browser (Browser)                    |
| 2025-07-18 | phone (Phone)                        |
| 2025-07-25 | markdown_result (Markdown result)     |
| 2025-07-25 | file_diff (File diff)                |
