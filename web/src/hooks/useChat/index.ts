import {
  FileItem,
  HitlApprovalResumeContent,
  KnowledgeBaseItem,
  MCPToolItem,
  MessageMetadata,
  ModelItem,
} from '@/types';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useAgentStoreApi, useRequestClient } from '@/store';
import { useChunksUISync } from '../useChunksUISync';
import eventBus from '@/utils/eventBus';
import { useNetworkRecovery } from './network/useNetworkRecovery';
import { useSendContinue } from './core/useSendContinue';
import { useChunkParser } from './core/useChunkParser';
import { useSSEHandler } from './core/useSSEHandler';
import { useSessionManager } from './core/useSessionManager';
import { useSend } from './core/useSend';

export type SendContent = string | boolean | string[] | HitlApprovalResumeContent;

export interface SendOptions {
  type?: 'user_message' | 'custom_action' | 'client_tool_result';
  params?: any;
  content: string;
  resumeContent?: SendContent;
  files?: FileItem[];
  mcpTools?: MCPToolItem[];
  knowledgeBases?: KnowledgeBaseItem[];
  models?: ModelItem[];
  mode?: string;
  generalAgentMode?: string;
  options?: Record<string, any>;
  metadata?: MessageMetadata;
}

interface UseChatReturn {
  /**
   * Send a message.
   */
  send: (options: SendOptions) => Promise<void>;

  /**
   * Stop the task through the stop API without directly aborting SSE.
   */
  stop: () => void;
}

/**
 * Use hooks for operations and the store for state.
 */
const useChat = (basePath: string, agentId: string, sessionId: string): UseChatReturn => {
  const storeApi = useAgentStoreApi();
  const requestClient = useRequestClient();
  const { chatEndpoint, instanceId } = storeApi.getState();

  const runAfterSend = useRef<() => void>(() => {});

  // Determine whether send-continue is enabled.
  const enableSendContinue = !chatEndpoint;

  // Store.
  const chunks = storeApi.getState().chunks;

  // State.

  // Read chunks from the active store.
  useChunksUISync(chunks);

  // Refs.

  // Retry timer.
  const retryTimerRef = useRef(null);

  // Chunk batching timer.
  const debounceTimerRef = useRef<number>(0);

  const basePathRef = useRef<string>(basePath);
  const agentIdRef = useRef<string>(agentId);

  // Last user message.
  const currentMessageRef = useRef<string>('');
  // Keep the latest sessionId in a ref to avoid stale closures.
  const sessionIdRef = useRef<string>(sessionId);
  // Keep send in a ref to avoid a circular dependency.
  const sendRef = useRef<((options: SendOptions) => Promise<void>) | null>(null);

  // Functions.

  // Parse chunks with useChunkParser.
  const { handleChunk, addPendingChunks, pendingChunks } = useChunkParser({
    storeApi,
    currentMessageRef,
  });

  /**
   * Stable completion callback.
   */
  const onSendComplete = useCallback(() => {
    storeApi.getState().setStopped(true);
    // Clear senderSending when necessary.
    if (storeApi.getState().senderSending) {
      storeApi.getState().setSenderSending(false);
    }
    // Clear senderStopping when necessary.
    if (storeApi.getState().senderStopping) {
      storeApi.getState().setSenderStopping(false);
    }
    // Clear any pending retry timer.
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    runAfterSend.current();
    runAfterSend.current = () => {};
  }, [storeApi]);

  // Process SSE streams with useSSEHandler.
  const { handleResponse } = useSSEHandler({
    storeApi,
    debounceTimerRef,
    retryTimerRef,
    handleChunk,
    addPendingChunks,
    enableSendContinue,
  });

  // Configure send-continue.
  const { sendContinue } = useSendContinue({
    sessionIdRef,
    storeApi,
    retryTimerRef,
    handleResponse,
    onSendComplete,
    enableSendContinue,
  });

  // Manage sessions with useSessionManager.
  useSessionManager({
    sessionId,
    sessionIdRef,
    storeApi,
    debounceTimerRef,
    retryTimerRef,
    pendingChunksRef: pendingChunks,
    sendContinue,
    sendRef,
    enableSendContinue,
  });

  const { send } = useSend({
    sessionIdRef,
    basePathRef,
    agentIdRef,
    currentMessageRef,
    retryTimerRef,
    storeApi,
    handleResponse,
    sendContinue,
    onSendComplete,
    enableSendContinue,
  });

  // Keep sendRef current.
  sendRef.current = send;

  const stop = useCallback(() => {
    // Direct chat mode has no session stop API, so abort the SSE request directly.
    if (chatEndpoint) {
      storeApi.getState().abortController?.abort();
      storeApi.getState().setStopped(true);
    } else {
      // In AgentX mode, call stopTask and wait for the SSE stream to end.
      storeApi.getState().setSenderStopping(true);
      requestClient.session.stopTask(sessionIdRef.current);
    }
  }, [chatEndpoint, storeApi, requestClient]);

  // Effects.

  // Configure network recovery.
  useNetworkRecovery({
    sessionIdRef,
    storeApi,
    sendContinue,
    retryTimerRef,
    sendRef,
    currentMessageRef,
    enableSendContinue,
  });

  // Update sessionIdRef before useEffect runs so useSessionManager observes the correct sessionId.
  useLayoutEffect(() => {
    basePathRef.current = basePath;
    agentIdRef.current = agentId;
    sessionIdRef.current = sessionId;
  }, [basePath, agentId, sessionId]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const callSend = (option: SendOptions) => {
      // Delay the send while another request is in progress.
      if (storeApi.getState().senderSending) {
        runAfterSend.current = () => {
          send(option);
        };
      } else {
        send(option);
      }
    };
    eventBus.on(`call_send_${instanceId}`, callSend);
    return () => {
      eventBus.off(`call_send_${instanceId}`, callSend);
    };
  }, [send, instanceId, storeApi]);

  // Public API.

  return {
    send,
    stop,
  };
};

export default useChat;
