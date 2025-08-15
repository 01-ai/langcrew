# 通用 Axios 实例封装总结

## 完成的工作

### 1. 创建通用 Axios 实例 (`src/services/request.ts`)

✅ **基础配置**
- 设置基础 URL: `/app/api`
- 设置超时时间: 30秒
- 配置携带 cookies
- 设置默认请求头

✅ **请求拦截器**
- 自动添加 CSRF token
- 自动添加通用请求头
- 请求日志记录
- 错误处理

✅ **响应拦截器**
- 自动处理业务错误码
- 统一的错误提示
- 支持 SSE 流数据
- 响应日志记录

✅ **错误处理**
- HTTP 状态码错误处理 (400, 401, 403, 404, 500, 502, 503)
- 网络错误处理
- 超时错误处理
- 业务错误码处理

✅ **封装方法**
- `http.get()` - GET 请求
- `http.post()` - POST 请求
- `http.put()` - PUT 请求
- `http.delete()` - DELETE 请求
- `http.patch()` - PATCH 请求
- `http.request` - 原始 axios 实例（用于特殊需求）

### 2. 创建 API 服务层 (`src/services/api.ts`)

✅ **Session API**
- `sessionApi.create()` - 创建 session
- `sessionApi.getDetail()` - 获取 session 详情
- `sessionApi.sendMessage()` - 发送消息（SSE）

✅ **文件上传 API**
- `fileApi.getPresignedUrl()` - 获取预签名上传 URL
- `fileApi.upload()` - 上传文件

✅ **云手机 API**
- `cloudPhoneApi.getSecurityToken()` - 获取安全令牌

✅ **分享 API**
- `shareApi.getDetail()` - 获取分享详情

### 3. 更新现有代码

✅ **更新 useChat hook**
- 使用 `sessionApi` 替代原有的 fetch 调用
- 统一错误处理
- 类型安全

✅ **更新 useReplay hook**
- 使用 `shareApi` 替代原有的函数调用
- 添加错误处理

✅ **更新 FileUpload 组件**
- 使用 `fileApi` 替代原有的 fetch 调用
- 简化代码逻辑

✅ **更新 CloudPhone 组件**
- 使用 `cloudPhoneApi` 替代原有的 axios 调用
- 统一错误处理

### 4. 类型定义

✅ **RequestConfig 接口**
```typescript
interface RequestConfig extends AxiosRequestConfig {
  showError?: boolean;    // 是否显示错误提示
  showLoading?: boolean;  // 是否显示加载状态
}
```

✅ **ApiResponse 接口**
```typescript
interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}
```

✅ **具体 API 接口类型**
- SessionData, CreateSessionParams, SendMessageParams
- FileUploadParams, FileUploadResponse
- SecurityTokenResponse
- ShareDetailParams, ShareDetailResponse

## 使用方式

### 基本使用
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

### 自定义配置
```typescript
const response = await http.get('/v1/sessions', {
  showError: false,    // 不显示错误提示
  showLoading: true,   // 显示加载状态
  timeout: 10000,      // 自定义超时时间
});
```

### 错误处理
```typescript
try {
  const response = await http.get('/v1/sessions');
  console.log(response.data);
} catch (error) {
  // 错误已经被拦截器处理，这里可以添加额外逻辑
  console.error('请求失败:', error);
}
```

## 优势

### 1. **统一管理**
- 所有 API 调用都通过统一的实例
- 统一的配置和错误处理
- 便于维护和扩展

### 2. **类型安全**
- 完整的 TypeScript 类型定义
- 编译时类型检查
- 更好的开发体验

### 3. **错误处理**
- 统一的错误处理逻辑
- 自动显示错误提示
- 支持自定义错误处理

### 4. **日志记录**
- 自动记录请求和响应日志
- 便于调试和问题排查

### 5. **配置灵活**
- 支持自定义配置
- 支持环境变量配置
- 支持不同环境的配置

## 后续扩展

### 1. 添加新的 API 接口
1. 在 `api.ts` 中添加新的接口定义
2. 添加相应的类型定义
3. 更新使用示例

### 2. 添加中间件
- 请求/响应转换
- 缓存处理
- 重试机制
- 请求队列

### 3. 环境配置
- 开发/测试/生产环境配置
- 动态 baseURL 配置
- 环境变量支持

### 4. 监控和统计
- 请求性能监控
- 错误率统计
- 用户行为分析

## 总结

通过封装通用的 axios 实例，我们实现了：

1. **代码统一**：所有 API 调用都使用统一的接口
2. **类型安全**：完整的 TypeScript 支持
3. **错误处理**：统一的错误处理逻辑
4. **易于维护**：集中的配置管理
5. **便于扩展**：模块化的设计

这大大提高了代码的可维护性和开发效率，为后续的功能扩展奠定了良好的基础。 