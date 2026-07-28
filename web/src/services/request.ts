import baseAxios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { getTranslation } from '@/hooks/useTranslation';
import { message } from 'antd';
import { getLanguage } from '@/hooks/useTranslation';

// Request Configure Interface
export interface RequestConfig extends AxiosRequestConfig {
  showError?: boolean; // Whether to show the error hint
  showLoading?: boolean; // Whether to show load state
  /** Example level extra request header from the caller AgentStore.requestConfig Import */
  extraHeaders?: Record<string, string>;
}

// Response data interface
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// Create axios Example
export const axios: AxiosInstance = baseAxios.create({
  //   baseURL: '', // Foundation URL
  timeout: 30000, // Request timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Carry cookies
});

export const getCommonRequestHeaders = (
  additionalHeaders?: Record<string, string>,
  instanceExtraHeaders?: Record<string, string>,
): Record<string, string> => ({
  'csrf-token': getCsrfToken() || '',
  language: getLanguage(),
  'accept-language': getLanguage(),
  ...instanceExtraHeaders,
  ...additionalHeaders,
});

export const buildAxiosRequestConfig = (
  extraHeaders?: Record<string, string>,
  config?: RequestConfig,
): RequestConfig => {
  if (!extraHeaders || Object.keys(extraHeaders).length === 0) {
    return config ?? {};
  }
  return { ...config, extraHeaders };
};

export const getCsrfToken = () => {
  let csrfToken = localStorage.getItem('auth-token');
  if (process.env.NODE_ENV === 'development' && !csrfToken) {
    csrfToken = 'JWT_EXAMPLE';
  }
  return csrfToken;
};

// Request interceptor.
axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token
    let csrfToken = localStorage.getItem('auth-token');

    if (process.env.NODE_ENV === 'development' && !csrfToken) {
      csrfToken = getCsrfToken();
    }

    // Settings headers
    config.headers.set('csrf-token', csrfToken);
    config.headers.set('language', getLanguage());
    config.headers.set('accept-language', getLanguage());

    const instanceExtraHeaders = (config as RequestConfig).extraHeaders;
    if (instanceExtraHeaders) {
      Object.entries(instanceExtraHeaders).forEach(([key, value]) => {
        config.headers.set(key, value);
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor
axios.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data, config } = response;

    // If the response is stream data (e.g.) SSE），Go straight back.
    if (response.headers['content-type']?.includes('text/event-stream')) {
      return response;
    }

    // Processing business errors
    if (data.code !== 200 && data.code !== 0) {
      const errorMessage = data.message || getTranslation('request.failed');

      // Whether to show the error hint based on configuration
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

    let errorMessage = getTranslation('request.network_error');

    if (response) {
      // Server returns the error status code
      switch (response.status) {
        case 400:
          errorMessage = getTranslation('request.bad_request');
          break;
        case 401:
          errorMessage = getTranslation('request.unauthorized');
          // You can handle login jumps here.
          break;
        case 403:
          errorMessage = getTranslation('request.forbidden');
          break;
        case 404:
          errorMessage = getTranslation('request.not_found');
          break;
        case 500:
          errorMessage = getTranslation('request.server_error');
          break;
        case 502:
          errorMessage = getTranslation('request.bad_gateway');
          break;
        case 503:
          errorMessage = getTranslation('request.service_unavailable');
          break;
        default:
          errorMessage = getTranslation('request.failed_with_status', { status: response.status });
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = getTranslation('request.timeout');
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Whether to show the error hint based on configuration
    const showError = (config as RequestConfig)?.showError !== false;
    if (showError) {
      message.error(errorMessage);
    }

    return Promise.reject(error);
  },
);

export default axios;
