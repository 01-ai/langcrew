import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { getLanguage } from '@/hooks/useTranslation';

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  showError?: boolean; // 是否显示错误提示
  showLoading?: boolean; // 是否显示加载状态
}

// 响应数据接口
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  //   baseURL: '', // 基础 URL
  timeout: 30000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 携带 cookies
});

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 设置 headers
    config.headers.set('language', getLanguage());

    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  },
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data, config } = response;

    // 如果响应是流数据（如 SSE），直接返回
    if (response.headers['content-type']?.includes('text/event-stream')) {
      return response;
    }

    // 处理业务错误
    if (data.code !== 200 && data.code !== 0) {
      const errorMessage = data.message || '请求失败';

      // 根据配置决定是否显示错误提示
      const showError = (config as RequestConfig).showError !== false;
      if (showError) {
        message.error(errorMessage);
      }

      return Promise.reject(new Error(errorMessage));
    }

    return response;
  },
  (error: AxiosError) => {
    const { config, response } = error;

    console.error('Response error:', error);

    let errorMessage = '网络错误';

    if (response) {
      // 服务器返回错误状态码
      switch (response.status) {
        case 400:
          errorMessage = '请求参数错误';
          break;
        case 401:
          errorMessage = '未授权，请重新登录';
          // 可以在这里处理登录跳转
          break;
        case 403:
          errorMessage = '拒绝访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        case 502:
          errorMessage = '网关错误';
          break;
        case 503:
          errorMessage = '服务不可用';
          break;
        default:
          errorMessage = `请求失败 (${response.status})`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时';
    } else if (error.message) {
      errorMessage = error.message;
    }

    // 根据配置决定是否显示错误提示
    const showError = (config as RequestConfig)?.showError !== false;
    if (showError) {
      message.error(errorMessage);
    }

    return Promise.reject(error);
  },
);

// 封装通用请求方法
export const http = {
  // GET 请求
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.get(url, config).then((response) => response.data);
  },

  // POST 请求
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.post(url, data, config).then((response) => response.data);
  },

  // PUT 请求
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.put(url, data, config).then((response) => response.data);
  },

  // DELETE 请求
  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.delete(url, config).then((response) => response.data);
  },

  // PATCH 请求
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.patch(url, data, config).then((response) => response.data);
  },

  // 原始 axios 实例（用于特殊需求）
  request,
};

export default http;
