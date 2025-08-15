# Error 消息类型

## 概述

Error 消息类型用于显示错误信息，提供统一的错误展示格式。

## 功能特性

- ✅ **BriefRenderer**: 在左侧消息列表中显示错误信息
- ❌ **DetailRenderer**: 不提供详情渲染器（按需求）

## 使用方式

### 1. 消息格式

```typescript
const errorMessage: MessageChunk = {
  id: 'error-1',
  type: 'error',
  role: 'assistant',
  content: '请求失败，请稍后重试',
  timestamp: Date.now(),
};
```

### 2. 自动注册

Error 类型会在应用启动时自动注册，无需手动注册。

### 3. 渲染效果

BriefRenderer 会显示一个红色的 Alert 组件，包含：
- 错误图标
- "错误" 标题
- 错误描述信息

## 样式

- 使用 Antd 的 Alert 组件
- 类型为 "error"
- 显示图标
- 底部间距为 8px

## 示例

```typescript
// 在 useChat hook 中使用
addChunk({
  id: Date.now().toString(),
  role: 'assistant',
  type: 'error',
  content: '网络连接失败，请检查网络设置',
  timestamp: Date.now(),
});
```

## 扩展

如需自定义错误显示样式，可以修改 `ErrorBriefRenderer.tsx` 文件。 