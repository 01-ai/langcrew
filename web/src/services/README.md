# API 服务使用指南

## 概述

本项目封装了一个通用的 axios 实例，提供了统一的接口调用方式，包括：

- 统一的请求/响应拦截器
- 统一的错误处理
- 统一的头部配置
- TypeScript 类型支持

## 文件结构

```
src/services/
├── request.ts    # 通用 axios 实例配置
├── api.ts        # API 接口封装
└── README.md     # 使用说明
```

## 基本使用

### 1. 导入和使用

```typescript
import http from '@/services/request';
import api from '@/services/api';

// 使用封装的 http 方法
const response = await http.get('/v1/sessions');
const data = await http.post('/v1/sessions', { content: 'hello' });

// 使用具体的 API 方法
const session = await api.session.create({ content: 'hello' });
const detail = await api.session.getDetail('session-id');
```

### 2. 请求配置

```typescript
// 自定义配置
const response = await http.get('/v1/sessions', {
  showError: false,    // 不显示错误提示
  showLoading: true,   // 显示加载状态
  timeout: 10000,      // 自定义超时时间
});
```

### 3. 错误处理

```typescript
try {
  const response = await http.get('/v1/sessions');
  console.log(response.data);
} catch (error) {
  // 错误已经被拦截器处理，这里可以添加额外逻辑
  console.error('请求失败:', error);
}
```

## API 接口

### Session API

```typescript
import { sessionApi } from '@/services/api';

// 创建 session
const session = await sessionApi.create({
  content: 'hello',
  kb_info: { kb_ids: ['1', '2'] },
  agent_tool_info: {
    agent_tool_items: [
      { agent_tool_id: 'tool1', agent_tool_type: 'type1' }
    ]
  }
});

// 获取 session 详情
const detail = await sessionApi.getDetail('session-id');

// 发送消息（SSE）
const response = await sessionApi.sendMessage('session-id', {
  content: 'hello',
  files: [],
  mock: true
});
```

### 文件上传 API

```typescript
import { fileApi } from '@/services/api';

// 获取预签名上传 URL
const presigned = await fileApi.getPresignedUrl('file-md5');

// 上传文件
const formData = new FormData();
formData.append('file', file);
const uploadResponse = await fileApi.upload(presigned.data.url, formData);
```

### 云手机 API

```typescript
import { cloudPhoneApi } from '@/services/api';

// 获取安全令牌
const token = await cloudPhoneApi.getSecurityToken();
```

### 分享 API

```typescript
import { shareApi } from '@/services/api';

// 获取分享详情
const shareDetail = await shareApi.getDetail({
  shareId: 'share-id',
  encrypt: true,
  password: 'password'
});
```

## 配置说明

### 请求拦截器

- 自动添加 CSRF token
- 自动添加通用请求头
- 请求日志记录

### 响应拦截器

- 自动处理业务错误码
- 统一的错误提示
- 支持 SSE 流数据
- 响应日志记录

### 错误处理

- HTTP 状态码错误处理
- 网络错误处理
- 超时错误处理
- 业务错误码处理

## 类型定义

```typescript
// 请求配置
interface RequestConfig extends AxiosRequestConfig {
  showError?: boolean;    // 是否显示错误提示
  showLoading?: boolean;  // 是否显示加载状态
}

// 响应数据
interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}
```

## 最佳实践

1. **使用具体的 API 方法**：优先使用 `api.ts` 中封装的具体方法，而不是直接使用 `http`

2. **错误处理**：在业务代码中捕获异常，添加业务逻辑处理

3. **类型安全**：使用 TypeScript 类型定义，确保类型安全

4. **配置管理**：根据环境配置不同的 baseURL 和超时时间

5. **日志记录**：利用内置的请求/响应日志进行调试

## 扩展

如需添加新的 API 接口：

1. 在 `api.ts` 中添加新的接口定义
2. 在 `request.ts` 中添加新的请求方法（如需要）
3. 更新类型定义
4. 添加使用示例到文档 