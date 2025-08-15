# Image Generation 类型

## 概述

`image_generation` 类型用于渲染图片生成相关的消息内容。

## 文件结构

```
image_generation/
├── index.ts                           # 类型注册文件
├── ImageGenerationBriefRenderer.tsx   # 简要渲染器（左侧消息列表）
├── ImageGenerationDetailRenderer.tsx  # 详情渲染器（右侧详情区域）
└── README.md                          # 说明文档
```

## 功能特性

- **简要渲染器**: 在左侧消息列表中显示图片生成工具的图标和操作信息
- **详情渲染器**: 在右侧详情区域中显示生成的图片

## 消息格式

### 输入格式

```typescript
{
  type: 'image_generation',
  content: '生成图片的描述或提示词',
  detail: {
    action: 'image_generation',
    param: {
      image_url: 'https://example.com/generated-image.jpg'
    }
    // 或者
    result: {
      image_url: 'https://example.com/generated-image.jpg'
    }
  }
}
```

### 支持的图片URL字段

- `message.detail.param.image_url`
- `message.detail.result.image_url`

## 使用示例

```typescript
import registry from '@/registry';

// 获取渲染组件
const Brief = registry.getBriefRenderer('image_generation');
const Detail = registry.getDetailRenderer('image_generation');

// 渲染消息
<Brief message={message} />
<Detail message={message} />
```

## 依赖组件

- `ToolBriefRenderer`: 通用工具简要渲染器
- `ImageDetailRenderer`: 通用图片详情渲染器
- `PictureOutlined`: Ant Design 图标 