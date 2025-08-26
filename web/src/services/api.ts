import { SessionInfo } from '@/types';
import http, { ApiResponse } from './request';
import { useAgentStore } from '@/store';
import { getLanguage } from '@/hooks/useTranslation';

// Session 相关接口
export interface SessionData {
  session_info: SessionInfo;
  messages: any[];
}

export interface CreateSessionParams {
  content: string;
  kb_info?: {
    kb_ids: string[];
  };
  agent_tool_info?: {
    agent_tool_items: Array<{
      agent_tool_id: string;
      agent_tool_type: string;
    }>;
  };
  super_employee_id: string;
}

export interface SendMessageParams {
  content: string;
  files?: Array<{
    name: string;
    key: string;
  }>;
  mock?: boolean;
}

// Session API
export const sessionApi = {
  // 创建 session
  create: (params: CreateSessionParams): Promise<ApiResponse<{ session_id: string }>> => {
    return http.post(`${useAgentStore.getState().requestPrefix}/api/v1/sessions/`, params);
  },

  // 获取 session 详情
  getDetail: (sessionId: string): Promise<ApiResponse<SessionData>> => {
    return http.get(`${useAgentStore.getState().requestPrefix}/api/v1/sessions/${sessionId}/detail`);
  },

  // 发送消息
  sendMessage: (sessionId: string, params: SendMessageParams): Promise<Response> => {
    // 对于 SSE 请求，使用原始的 axios 实例
    return http.request.post(`${useAgentStore.getState().requestPrefix}/api/v1/sessions/${sessionId}/send`, params, {
      headers: {
        accept: 'text/event-stream',
        'Content-Type': 'application/json',
        language: getLanguage(),
      },
    });
  },

  stopTask: (taskId: string): Promise<any> => {
    return http.post(`${useAgentStore.getState().requestPrefix}/api/v1/chat/stop`, {
      task_id: taskId,
    });
  },

  addNewMessage: (sessionId: string, message: string): Promise<any> => {
    return http.post(`${useAgentStore.getState().requestPrefix}/api/v1/update_task`, {
      session_id: sessionId,
      message,
    });
  },
};

// 文件上传相关接口
export interface FileUploadParams {
  md5: string;
}

export interface FileUploadResponse {
  url: string;
  fields: Record<string, string>;
}

// 文件 API
export const fileApi = {
  // 获取预签名上传 URL
  getPresignedUrl: (md5: string): Promise<ApiResponse<FileUploadResponse>> => {
    return http.get(`/popai/api/py/api/v1/chat/getPresignedPost?md5=${md5}`);
  },

  // 上传文件
  upload: (url: string, formData: FormData): Promise<Response> => {
    return fetch(url, {
      method: 'POST',
      body: formData,
    });
  },
};

// 云手机相关接口
export interface SecurityTokenResponse {
  access_key: string;
  secret_key: string;
}

// 云手机 API
export const cloudPhoneApi = {
  // 获取安全令牌
  getSecurityToken: (): Promise<ApiResponse<SecurityTokenResponse>> => {
    return http.post(`${useAgentStore.getState().requestPrefix}/api/v1/instance/security-token`, {});
  },
};

// 分享相关接口
export interface ShareDetailParams {
  shareId: string;
  encrypt?: boolean;
  password?: string;
}

export interface ShareDetailResponse {
  session: {
    id: string;
  };
  messages: any[];
}

// 分享 API
export const shareApi = {
  // 获取分享详情
  getDetail: (params: ShareDetailParams): Promise<ApiResponse<ShareDetailResponse>> => {
    return http.get(`${useAgentStore.getState().requestPrefix}/api/v1/sessions/share/${params.shareId}`, {
      params,
    });
  },
};

// 导出所有 API
export default {
  session: sessionApi,
  file: fileApi,
  cloudPhone: cloudPhoneApi,
  share: shareApi,
};
