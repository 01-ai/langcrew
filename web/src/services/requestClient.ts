import type {
  ConversationFeedback,
  FeedbackMap,
  FileItem,
  KnowledgeQueryRequest,
  MessageMetadata,
  SessionInfo,
} from '@/types';
import { buildAxiosRequestConfig, getCommonRequestHeaders, http } from './request';

export interface AgentXCapabilities {
  sessionRest?: boolean;
  feedback?: boolean;
  sessionFiles?: boolean;
  managedFileUpload?: boolean;
}

export interface SessionData {
  session_info: SessionInfo;
  messages: any[];
  feedback?: FeedbackMap;
}

export interface CreateSessionInput {
  content: string;
  knowledge_ids: string[];
  super_employee_id?: string;
  mode?: string;
  model?: {
    id: string;
    model_display_name: string;
  };
  showSenderActions?: boolean;
}

export interface FileUploadResponse {
  url: string;
  fields: Record<string, string>;
  download_url?: string;
}

/**
 * Optional host adapter for managed session APIs.
 *
 * The open-source default transport intentionally does not assume the
 * managed session REST contract. Hosts that provide those
 * capabilities can opt in by supplying this adapter.
 */
export interface AgentXRequestAdapter {
  capabilities?: AgentXCapabilities;
  createSession?: (input: CreateSessionInput, extraHeaders: Record<string, string>) => Promise<SessionInfo>;
  getSession?: (sessionId: string, extraHeaders: Record<string, string>) => Promise<SessionData>;
  sendSession?: (
    sessionId: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    signal: AbortSignal,
  ) => Promise<Response>;
  sendContinue?: (
    sessionId: string,
    chunkId: string | number,
    headers: Record<string, string>,
    signal: AbortSignal,
  ) => Promise<Response>;
  stopTask?: (sessionId: string, extraHeaders: Record<string, string>) => Promise<unknown>;
  addNewMessage?: (
    sessionId: string,
    message: string,
    files: FileItem[],
    metadata: MessageMetadata | undefined,
    extraHeaders: Record<string, string>,
  ) => Promise<unknown>;
  getSessionFiles?: (sessionId: string, extraHeaders: Record<string, string>) => Promise<unknown>;
  submitFeedback?: (
    sessionId: string,
    responseId: string,
    payload: ConversationFeedback,
    extraHeaders: Record<string, string>,
  ) => Promise<ConversationFeedback>;
  deleteFeedback?: (sessionId: string, responseId: string, extraHeaders: Record<string, string>) => Promise<boolean>;
  getPresignedUrl?: (fileName: string, extraHeaders: Record<string, string>) => Promise<FileUploadResponse>;
  uploadFile?: (url: string, formData: FormData) => Promise<Response>;
}

type AgentStoreApi = {
  getState: () => {
    requestConfig?: {
      extraHeaders?: Record<string, string>;
      adapter?: AgentXRequestAdapter;
      capabilities?: AgentXCapabilities;
    };
  };
};

const unsupported = (capability: keyof AgentXCapabilities): never => {
  const error = Object.assign(new Error(`AgentX capability "${capability}" is not configured`), {
    code: capability === 'feedback' ? 'USER_NO_PERMISSION' : 'AGENTX_CAPABILITY_UNAVAILABLE',
  });
  throw error;
};

const unwrapData = <T>(response: { data?: T } | T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
};

export const createRequestClient = (storeApi: AgentStoreApi) => {
  const config = () => storeApi.getState().requestConfig ?? {};
  const extraHeaders = () => config().extraHeaders ?? {};
  const adapter = () => config().adapter;
  const capabilities = () => ({ ...adapter()?.capabilities, ...config().capabilities });

  return {
    capabilities,
    getCommonRequestHeaders: (additionalHeaders?: Record<string, string>) =>
      getCommonRequestHeaders(additionalHeaders, extraHeaders()),

    createSession: async (params: CreateSessionInput): Promise<SessionInfo> => {
      if (!capabilities().sessionRest || !adapter()?.createSession) {
        return unsupported('sessionRest');
      }
      return adapter()!.createSession!(params, extraHeaders());
    },

    getSession: async (sessionId: string): Promise<SessionData> => {
      if (!capabilities().sessionRest || !adapter()?.getSession) {
        return unsupported('sessionRest');
      }
      return adapter()!.getSession!(sessionId, extraHeaders());
    },

    sendSession: (
      sessionId: string,
      body: Record<string, unknown>,
      signal: AbortSignal,
    ): Promise<Response> => {
      if (!capabilities().sessionRest || !adapter()?.sendSession) {
        return unsupported('sessionRest');
      }
      return adapter()!.sendSession!(
        sessionId,
        body,
        getCommonRequestHeaders(
          {
            accept: 'text/event-stream',
            'Content-Type': 'application/json',
          },
          extraHeaders(),
        ),
        signal,
      );
    },

    sendContinue: (
      sessionId: string,
      chunkId: string | number,
      signal: AbortSignal,
    ): Promise<Response> => {
      if (!capabilities().sessionRest || !adapter()?.sendContinue) {
        return unsupported('sessionRest');
      }
      return adapter()!.sendContinue!(
        sessionId,
        chunkId,
        getCommonRequestHeaders(
          {
            accept: 'text/event-stream',
            'Content-Type': 'application/json',
          },
          extraHeaders(),
        ),
        signal,
      );
    },

    session: {
      stopTask: async (sessionId: string): Promise<unknown> => {
        if (adapter()?.stopTask) {
          return adapter()!.stopTask!(sessionId, extraHeaders());
        }
        return http.post(
          '/api/v1/chat/stop',
          { session_id: sessionId },
          buildAxiosRequestConfig(extraHeaders(), { showError: false }),
        );
      },
      addNewMessage: async (
        sessionId: string,
        message: string,
        files: FileItem[],
        metadata?: MessageMetadata,
      ): Promise<unknown> => {
        if (adapter()?.addNewMessage) {
          return adapter()!.addNewMessage!(sessionId, message, files, metadata, extraHeaders());
        }
        return http.post(
          '/api/v1/update_task',
          {
            session_id: sessionId,
            message,
            ...(files.length > 0 && { files }),
            ...(metadata !== undefined && { metadata }),
          },
          buildAxiosRequestConfig(extraHeaders(), { showError: false }),
        );
      },
      getFiles: async (sessionId: string): Promise<unknown> => {
        if (!capabilities().sessionFiles || !adapter()?.getSessionFiles) {
          return { data: { files: [], sandbox_id: '', source: '' } };
        }
        return adapter()!.getSessionFiles!(sessionId, extraHeaders());
      },
      submitFeedback: async (
        sessionId: string,
        responseId: string,
        payload: ConversationFeedback,
      ): Promise<ConversationFeedback> => {
        if (!capabilities().feedback || !adapter()?.submitFeedback) {
          return unsupported('feedback');
        }
        return adapter()!.submitFeedback!(sessionId, responseId, payload, extraHeaders());
      },
      deleteFeedback: async (sessionId: string, responseId: string): Promise<boolean> => {
        if (!capabilities().feedback || !adapter()?.deleteFeedback) {
          return unsupported('feedback');
        }
        return adapter()!.deleteFeedback!(sessionId, responseId, extraHeaders());
      },
    },

    file: {
      getPresignedUrl: async (fileName: string) => {
        if (!capabilities().managedFileUpload || !adapter()?.getPresignedUrl) {
          return unsupported('managedFileUpload');
        }
        const data = await adapter()!.getPresignedUrl!(fileName, extraHeaders());
        return { code: 0, message: '', data: unwrapData(data) };
      },
      upload: (url: string, formData: FormData): Promise<Response> => {
        if (adapter()?.uploadFile) {
          return adapter()!.uploadFile!(url, formData);
        }
        return fetch(url, { method: 'POST', body: formData });
      },
    },
  };
};

export type RequestClient = ReturnType<typeof createRequestClient>;

