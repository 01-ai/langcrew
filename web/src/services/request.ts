import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { getLanguage } from '@/hooks/useTranslation';

// Request config type
export interface RequestConfig extends AxiosRequestConfig {
  showError?: boolean; // Whether to show errors
  showLoading?: boolean; // Whether to show loading
  extraHeaders?: Record<string, string>;
}

// Response data type
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// Create the axios instance
export const request: AxiosInstance = axios.create({
  //   baseURL: '', // Base URL
  timeout: 30000, // Request timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies
});

export const getCommonRequestHeaders = (
  additionalHeaders?: Record<string, string>,
  instanceExtraHeaders?: Record<string, string>,
): Record<string, string> => ({
  language: getLanguage(),
  'accept-language': getLanguage(),
  ...instanceExtraHeaders,
  ...additionalHeaders,
});

export const buildAxiosRequestConfig = (
  extraHeaders?: Record<string, string>,
  config?: RequestConfig,
): RequestConfig => ({
  ...(config ?? {}),
  ...(extraHeaders && Object.keys(extraHeaders).length > 0 ? { extraHeaders } : {}),
});

// Request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Set headers
    config.headers.set('language', getLanguage());
    config.headers.set('accept-language', getLanguage());
    const extraHeaders = (config as RequestConfig).extraHeaders;
    Object.entries(extraHeaders ?? {}).forEach(([key, value]) => {
      config.headers.set(key, value);
    });

    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data, config } = response;

    // Return stream responses (e.g. SSE) as-is
    if (response.headers['content-type']?.includes('text/event-stream')) {
      return response;
    }

    return response;
  },
  (error: AxiosError) => {
    const { config, response } = error;

    console.error('Response error:', error);

    let errorMessage = 'Network error';

    if (response) {
      // Server returned an error status
      switch (response.status) {
        case 400:
          errorMessage = 'Invalid request';
          break;
        case 401:
          errorMessage = 'Unauthorized; please sign in again';
          // Redirect to login here if needed
          break;
        case 403:
          errorMessage = 'Forbidden';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 500:
          errorMessage = 'Internal server error';
          break;
        case 502:
          errorMessage = 'Bad gateway';
          break;
        case 503:
          errorMessage = 'Service unavailable';
          break;
        default:
          errorMessage = `Request failed (${response.status})`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out';
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Show errors based on config
    const showError = (config as RequestConfig)?.showError !== false;
    if (showError) {
      message.error(errorMessage);
    }

    return Promise.reject(error);
  },
);

// Shared request helpers
export const http = {
  // GET
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.get(url, config).then((response) => response.data);
  },

  // POST
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.post(url, data, config).then((response) => response.data);
  },

  // PUT
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.put(url, data, config).then((response) => response.data);
  },

  // DELETE
  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.delete(url, config).then((response) => response.data);
  },

  // PATCH
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request.patch(url, data, config).then((response) => response.data);
  },

  // Raw axios instance (special cases)
  request,
};

/** Named alias used by the adapter-backed request client. */
export { request as axios };

export default http;
