import type { KnowledgeQueryRequest, SessionInfo, FileItem, MessageMetadata } from '@/types';
import axios, { ApiResponse, buildAxiosRequestConfig, getCommonRequestHeaders } from './request';

type AgentStoreApi = {
  getState: () => {
    requestConfig?: {
      extraHeaders?: Record<string, string>;
    };
  };
};

interface SessionData {
  session_info: SessionInfo;
  messages: any[];
}

interface CreateSessionParams {
  content: string;
  knowledge_query_request?:
    | (Partial<Omit<KnowledgeQueryRequest, 'knowledge_ids'>> & { knowledge_ids: string[] })
    | null;
  agent_tool_info?: {
    agent_tool_items: Array<{
      agent_tool_id: string;
      agent_tool_type: string;
    }>;
  };
  super_employee_id: string;
  mode?: string;
  model?: {
    id: string;
    model_display_name: string;
  };
}

interface FileUploadResponse {
  url: string;
  fields: Record<string, string>;
}

interface EditMcpParams {
  mcp_server_id: string;
  config: any;
}

export type CreateSessionInput = {
  content: string;
  knowledge_ids: string[];
  agent_tool_items: { agent_tool_id: string; agent_tool_type: string }[];
  super_employee_id: string;
  mode?: string;
  model?: {
    id: string;
    model_display_name: string;
  };
  showSenderActions?: boolean;
};

const getInstanceExtraHeaders = (storeApi: AgentStoreApi) =>
  storeApi.getState().requestConfig?.extraHeaders ?? {};

const createSessionRequest = (
  params: CreateSessionParams,
  extraHeaders: Record<string, string>,
): Promise<ApiResponse<{ session_id: string }>> => {
  return axios
    .post(`/app/api/v1/sessions/`, params, buildAxiosRequestConfig(extraHeaders))
    .then((response) => response.data);
};

const getSessionDetailRequest = (
  sessionId: string,
  extraHeaders: Record<string, string>,
): Promise<ApiResponse<SessionData>> => {
  return axios
    .get(`/app/api/v1/sessions/${sessionId}/detail`, buildAxiosRequestConfig(extraHeaders))
    .then((response) => response.data);
};

const stopTaskRequest = (sessionId: string, extraHeaders: Record<string, string>): Promise<any> => {
  return axios
    .post(`/app/api/v1/sessions/${sessionId}/stop`, {}, buildAxiosRequestConfig(extraHeaders))
    .then((response) => response.data);
};

const addNewMessageRequest = (
  sessionId: string,
  message: string,
  files: FileItem[],
  metadata: MessageMetadata | undefined,
  extraHeaders: Record<string, string>,
): Promise<any> => {
  return axios
    .post(
      `/app/api/v1/sessions/${sessionId}/new_message`,
      {
        message,
        files,
        ...(metadata !== undefined && { metadata }),
      },
      buildAxiosRequestConfig(extraHeaders),
    )
    .then((response) => response.data);
};

const getSessionFilesRequest = (
  sessionId: string,
  extraHeaders: Record<string, string>,
): Promise<ApiResponse<{ files: any[]; sandbox_id: string; source: string }>> => {
  return axios
    .get(`/app/api/v1/sessions/${sessionId}/files`, buildAxiosRequestConfig(extraHeaders))
    .then((response) => response.data);
};

const getPresignedUrlRequest = (
  md5: string,
  extraHeaders: Record<string, string>,
): Promise<ApiResponse<FileUploadResponse>> => {
  return axios
    .get(`/app/api/v1/task/file/getPresignedPost?md5=${md5}`, buildAxiosRequestConfig(extraHeaders))
    .then((response) => response.data);
};

const uploadFileRequest = (url: string, formData: FormData): Promise<Response> => {
  return fetch(url, {
    method: 'POST',
    body: formData,
  });
};

const editMcpRequest = (params: EditMcpParams, extraHeaders: Record<string, string>): Promise<ApiResponse<any>> => {
  return axios
    .post(`/app/api/v1/deep-mcp/config`, params, buildAxiosRequestConfig(extraHeaders))
    .then((response) => response.data);
};

/**
 * Tie AgentStore Example requested client.
 * From request store Read extraHeaders，Avoids the call points manually.
 */
export const createRequestClient = (storeApi: AgentStoreApi) => {
  const extraHeaders = () => getInstanceExtraHeaders(storeApi);

  return {
    getCommonRequestHeaders: (additionalHeaders?: Record<string, string>) =>
      getCommonRequestHeaders(additionalHeaders, extraHeaders()),

    createSession: async (params: CreateSessionInput): Promise<SessionInfo> => {
      const response = await createSessionRequest(
        {
          content: params.content,
          ...(params.showSenderActions
            ? {
                knowledge_query_request: {
                  knowledge_ids: params.knowledge_ids || [],
                },
              }
            : {}),
          agent_tool_info: {
            agent_tool_items: params.agent_tool_items,
          },
          super_employee_id: params.super_employee_id,
          mode: params.mode,
          model: params.model,
        },
        extraHeaders(),
      );
      return response.data as SessionInfo;
    },

    getSession: async (sessionId: string) => {
      const response = await getSessionDetailRequest(sessionId, extraHeaders());
      return response.data;
    },

    session: {
      stopTask: (sessionId: string) => stopTaskRequest(sessionId, extraHeaders()),
      addNewMessage: (sessionId: string, message: string, files: FileItem[], metadata?: MessageMetadata) =>
        addNewMessageRequest(sessionId, message, files, metadata, extraHeaders()),
      getFiles: (sessionId: string) => getSessionFilesRequest(sessionId, extraHeaders()),
    },

    file: {
      getPresignedUrl: (md5: string) => getPresignedUrlRequest(md5, extraHeaders()),
      upload: uploadFileRequest,
    },

    mcp: {
      edit: (params: EditMcpParams) => editMcpRequest(params, extraHeaders()),
    },
  };
};

export type RequestClient = ReturnType<typeof createRequestClient>;
