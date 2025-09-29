import { SessionInfo } from '@/types';
import http, { ApiResponse } from './request';
import { useAgentStore } from '@/store';
import { getLanguage } from '@/hooks/useTranslation';

// Session related interfaces
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
  stopTask: (sessionId: string): Promise<any> => {
    return http.post(`${useAgentStore.getState().requestPrefix}/api/v1/chat/stop`, {
      session_id: sessionId,
    });
  },

  addNewMessage: (sessionId: string, message: string): Promise<any> => {
    return http.post(`${useAgentStore.getState().requestPrefix}/api/v1/update_task`, {
      session_id: sessionId,
      message,
    });
  },
};

// Cloud phone related interfaces
export interface SecurityTokenResponse {
  access_key: string;
  secret_key: string;
}

// Cloud phone API
export const cloudPhoneApi = {
  // Get security token
  getSecurityToken: (): Promise<ApiResponse<SecurityTokenResponse>> => {
    return http.post(`${useAgentStore.getState().requestPrefix}/api/v1/instance/security-token`, {});
  },
};

// Share related interfaces
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

// Share API
export const shareApi = {
  // Get share details
  getDetail: (params: ShareDetailParams): Promise<ApiResponse<ShareDetailResponse>> => {
    return http.get(`${useAgentStore.getState().requestPrefix}/api/v1/sessions/share/${params.shareId}`, {
      params,
    });
  },
};

// Export all APIs
export default {
  session: sessionApi,
  share: shareApi,
};
