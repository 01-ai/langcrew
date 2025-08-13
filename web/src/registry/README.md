# Registry 消息类型注册系统

## 概述

`src/registry` 目录实现了一个灵活的消息类型注册系统，用于管理不同类型消息的渲染组件。该系统支持为每种消息类型注册左侧简要渲染组件（BriefRenderer）和右侧详情渲染组件（DetailRenderer），并提供默认渲染组件作为回退机制。

## 架构设计

### 核心概念

- **BriefRenderer**: 左侧消息列表中的简要渲染组件
- **DetailRenderer**: 右侧详情区域中的详细渲染组件
- **MessageTypeRegistry**: 消息类型注册表，管理所有注册的渲染组件
- **MessageTypeConfig**: 单个消息类型的配置接口

### 类型匹配机制

系统支持三种类型匹配方式：

1. **字符串匹配**: 精确匹配特定消息类型
2. **数组匹配**: 多个类型使用同一套渲染组件
3. **正则匹配**: 动态类型匹配，支持模式匹配

```typescript
// 字符串匹配
registry.registerMessageType({
  type: 'text',
  briefRenderer: TextBriefRenderer,
});

// 数组匹配
registry.registerMessageType({
  type: ['file_read', 'file_write', 'file_delete'],
  briefRenderer: FileOperationBrief,
  detailRenderer: FileOperationDetail,
});

// 正则匹配
registry.registerMessageType({
  type: /^browser_/,
  briefRenderer: BrowserToolBrief,
  detailRenderer: BrowserToolDetail,
  icon: BrowserIcon,
});
```

## 目录结构

```
src/registry/
├── index.ts                    # 主注册表和核心接口定义
├── builtin.ts                  # 内置消息类型注册入口
├── default/                    # 默认渲染组件
│   ├── DefaultBriefRenderer.tsx
│   └── DefaultDetailRenderer.tsx
├── common/                     # 公共组件和工具
│   ├── icons.tsx               # 工具图标组件
│   ├── ToolBriefRenderer.tsx   # 通用工具简要渲染器
│   ├── ErrorDetailRenderer.tsx
│   ├── ImageDetailRenderer.tsx
│   ├── MessageBrief.tsx
│   └── useToolContent.ts       # 工具内容处理 Hook
├── text/                       # 文本消息类型
├── web_search/                 # 网页搜索类型
├── code_interpreter/           # 代码解释器类型
├── file_*                      # 文件操作相关类型
├── image_*                     # 图片相关类型
├── browser/                    # 浏览器工具类型
├── phone/                      # 手机工具类型
├── mysql/                      # MySQL 数据库类型
├── error/                      # 错误消息类型
├── plan/                       # 计划消息类型
├── live_status/                # 实时状态类型
├── user_input/                 # 用户输入类型
├── finish_reason/              # 完成原因类型
├── message_to_user/        # 用户通知类型
├── knowledge_search/           # 知识库搜索类型
├── chunk_retrieval/            # 块检索类型
└── service_deploy/             # 服务部署类型
```

## 核心接口

### MessageTypeConfig

```typescript
export interface MessageTypeConfig {
  type: MessageTypeMatcher; // 支持字符串、数组或正则表达式
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

## 内置消息类型

### 基础类型

| 类型          | 描述       | BriefRenderer | DetailRenderer | 图标 |
| ------------- | ---------- | ------------- | -------------- | ---- |
| `text`        | 纯文本消息 | ✅            | ❌             | -    |
| `error`       | 错误消息   | ✅            | ❌             | -    |
| `live_status` | 实时状态   | ✅            | ❌             | -    |
| `plan`        | 计划消息   | ✅            | ❌             | -    |

### 工具类型

| 类型               | 描述         | BriefRenderer | DetailRenderer | 图标 |
| ------------------ | ------------ | ------------- | -------------- | ---- |
| `web_search`       | 网页搜索     | ❌            | ✅             | 🔍   |
| `code_interpreter` | 代码解释器   | ❌            | ✅             | 💻   |
| `browser/*`        | 浏览器工具   | ❌            | ✅             | 🌐   |
| `phone/*`          | 手机工具     | ❌            | ✅             | 📱   |
| `mysql/*`          | MySQL 数据库 | ❌            | ✅             | 🗄️   |

### 文件操作类型

| 类型                | 描述         | BriefRenderer | DetailRenderer | 图标 |
| ------------------- | ------------ | ------------- | -------------- | ---- |
| `write_file`        | 写文件       | ❌            | ✅             | 📄   |
| `read_file`         | 读文件       | ❌            | ✅             | 📄   |
| `file_read_text`    | 读取文本文件 | ❌            | ✅             | 📄   |
| `file_append_text`  | 追加文本     | ❌            | ✅             | 📄   |
| `file_replace_text` | 替换文本     | ❌            | ✅             | 📄   |
| `file_parser`       | 文件解析     | ❌            | ✅             | 📄   |
| `delete_file`       | 删除文件     | ❌            | ✅             | 🗑️   |

### 图片相关类型

| 类型               | 描述     | BriefRenderer | DetailRenderer | 图标 |
| ------------------ | -------- | ------------- | -------------- | ---- |
| `image_parser`     | 图片解析 | ❌            | ✅             | 🖼️   |
| `image_generation` | 图片生成 | ❌            | ✅             | 🎨   |

### 其他类型

| 类型                  | 描述       | BriefRenderer | DetailRenderer | 图标 |
| --------------------- | ---------- | ------------- | -------------- | ---- |
| `run_command`         | 执行命令   | ❌            | ✅             | ⚡   |
| `service_deploy`      | 服务部署   | ❌            | ✅             | 🚀   |
| `knowledge_search`    | 知识库搜索 | ❌            | ✅             | 📚   |
| `chunk_retrieval`     | 块检索     | ❌            | ✅             | 🔍   |
| `user_input`          | 用户输入   | ✅            | ❌             | -    |
| `finish_reason`       | 完成原因   | ✅            | ❌             | -    |
| `message_to_user` | 用户通知   | ✅            | ❌             | -    |

## 使用指南

### 1. 注册新的消息类型

```typescript
// 1. 创建渲染组件
const CustomBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => (
  <div className="custom-brief">
    <span>自定义消息: {message.content}</span>
  </div>
);

const CustomDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => (
  <div className="custom-detail">
    <h3>详细信息</h3>
    <pre>{JSON.stringify(message.detail, null, 2)}</pre>
  </div>
);

// 2. 注册消息类型
import registry from '@/registry';
import { ToolIconCustom } from '@/registry/common/icons';

registry.registerMessageType({
  type: 'custom_type',
  briefRenderer: CustomBriefRenderer,
  detailRenderer: CustomDetailRenderer,
  icon: ToolIconCustom,
});
```

### 2. 在容器组件中使用

```typescript
// 左侧消息列表渲染
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

// 右侧详情区域渲染
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

### 3. 工具类型特殊处理

```typescript
// 工具类型消息需要特殊处理
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

## 公共组件

### ToolBriefRenderer

通用的工具简要渲染器，用于显示工具类型消息的基本信息。

```typescript
import ToolBriefRenderer from '@/registry/common/ToolBriefRenderer';

// 使用示例
<ToolBriefRenderer message={message} withIcon={true} />;
```

### useToolContent

用于提取工具消息内容的 Hook。

```typescript
import useToolContent from '@/registry/common/useToolContent';

const MyDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content } = useToolContent(message as MessageToolChunk);
  return <div>{content}</div>;
};
```

### 图标组件

预定义的工具图标组件，位于 `common/icons.tsx`：

- `ToolIconDefault`: 默认工具图标
- `ToolIconSearch`: 搜索图标
- `ToolIconCode`: 代码图标
- `ToolIconFile`: 文件图标
- `ToolIconImage`: 图片图标
- `ToolIconBrowser`: 浏览器图标
- `ToolIconPhone`: 手机图标
- `ToolIconCheck`: 检查图标
- `ToolIconEmpty`: 空状态图标

## 最佳实践

### 1. 文件组织

```
src/registry/
├── my_type/
│   ├── index.ts                    # 注册逻辑
│   ├── MyTypeBriefRenderer.tsx     # 简要渲染器
│   ├── MyTypeDetailRenderer.tsx    # 详情渲染器
│   └── README.md                   # 说明文档
```

### 2. 类型安全

```typescript
// 为特定工具类型定义专门的 props 接口
interface WebSearchBriefProps extends BriefRendererProps {
  message: MessageChunk & { type: 'web_search' };
}

const WebSearchBrief: React.FC<WebSearchBriefProps> = ({ message }) => {
  // 这里 message 的类型是安全的
  return <div>搜索: {message.query}</div>;
};
```

### 3. 错误处理

```typescript
// 检查消息类型是否已注册
const isRegistered = (type: string): boolean => {
  return !!registry.getMessageType(type);
};

// 获取渲染组件时提供默认值
const getRenderer = (type: string) => {
  try {
    return registry.getBriefRenderer(type);
  } catch (error) {
    console.warn(`Failed to get renderer for type: ${type}`, error);
    return registry.getBriefRenderer('text'); // 回退到文本渲染器
  }
};
```

### 4. 性能优化

```typescript
// 缓存渲染组件引用
const rendererCache = new Map<string, React.ComponentType<any>>();

const getCachedRenderer = (type: string) => {
  if (!rendererCache.has(type)) {
    rendererCache.set(type, registry.getBriefRenderer(type));
  }
  return rendererCache.get(type)!;
};
```

## 扩展指南

### 添加新的消息类型

1. **创建目录结构**：

   ```bash
   mkdir -p src/registry/new_type
   ```

2. **创建渲染组件**：

   ```typescript
   // src/registry/new_type/NewTypeBriefRenderer.tsx
   import React from 'react';
   import { BriefRendererProps } from '..';

   const NewTypeBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
     return <div>新类型消息: {message.content}</div>;
   };

   export default NewTypeBriefRenderer;
   ```

3. **注册消息类型**：

   ```typescript
   // src/registry/new_type/index.ts
   import registry from '..';
   import NewTypeBriefRenderer from './NewTypeBriefRenderer';

   registry.registerMessageType({
     type: 'new_type',
     briefRenderer: NewTypeBriefRenderer,
   });
   ```

4. **添加到内置注册**：
   ```typescript
   // src/registry/builtin.ts
   import './new_type';
   ```

### 自定义默认渲染组件

```typescript
// 替换默认渲染组件
registry.defaultBriefRenderer = CustomDefaultBriefRenderer;
registry.defaultDetailRenderer = CustomDefaultDetailRenderer;
registry.defaultIcon = CustomDefaultIcon;
```

## 调试和测试

### 调试工具

```typescript
// 检查注册状态
const debugRegistry = () => {
  console.log('Registered types:', Array.from(registry.stringTypes.keys()));
  console.log('Pattern types:', registry.patternTypes.length);
  console.log('Array types:', registry.arrayTypes.length);
};

// 测试类型匹配
const testTypeMatch = (type: string) => {
  const config = registry.getMessageType(type);
  console.log(`Type "${type}":`, config ? 'Found' : 'Not found');
  return config;
};
```

### 单元测试

```typescript
// 测试注册和获取
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

## 注意事项

1. **类型匹配优先级**：字符串匹配 > 数组匹配 > 正则匹配
2. **组件生命周期**：渲染组件应该是纯函数组件，避免副作用
3. **性能考虑**：大量消息时考虑使用 React.memo 优化渲染
4. **错误边界**：在容器组件中添加错误边界处理渲染异常
5. **国际化**：使用 `getTranslation` 函数支持多语言

## 更新日志

| 日期       | 增加的类型                          |
| ---------- | ----------------------------------- |
| 2025-06-24 | live_status (实时状态)              |
| 2025-06-24 | plan (计划)                         |
| 2025-06-30 | web_search (网页搜索)               |
| 2025-07-01 | run_command (执行命令)              |
| 2025-07-01 | delete_file (删除文件)              |
| 2025-07-01 | file_read_text (文件读取)           |
| 2025-07-01 | write_file (文件写入)               |
| 2025-07-01 | file_append_text (文件追加)         |
| 2025-07-01 | file_replace_text (文件替换)        |
| 2025-07-02 | browser_navigate_to (浏览器导航)    |
| 2025-07-03 | browser_click_element (浏览器点击)  |
| 2025-07-03 | browser_scroll (浏览器滚动)         |
| 2025-07-03 | browser_go_back (浏览器后退)        |
| 2025-07-03 | browser_send_keys (浏览器发送按键)  |
| 2025-07-03 | browser_input_text (浏览器输入文本) |
| 2025-07-04 | browser_switch_tab (浏览器切换标签) |
| 2025-07-04 | service_deploy (服务部署)           |
| 2025-07-05 | code_interpreter (代码解释器)       |
| 2025-07-05 | user_input (用户输入)               |
| 2025-07-07 | finish_reason (完成原因)            |
| 2025-07-09 | file_parser (文件解析)              |
| 2025-07-10 | message_to_user (用户通知消息)  |
| 2025-07-14 | image_parser (图片解析)             |
| 2025-07-15 | image_generation (图片生成)         |
| 2025-07-18 | mysql (SQL 执行)                    |
| 2025-07-18 | browser (浏览器)                    |
| 2025-07-18 | phone (手机)                        |
| 2025-07-25 | markdown_result (Markdown 结果)     |
| 2025-07-25 | file_diff (文件差异)                |
