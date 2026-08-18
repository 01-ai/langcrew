import {
  FileItem,
  HitlApprovalResumeContent,
  KnowledgeBaseItem,
  Mention,
  MessageMetadata,
  ModelItem,
} from '@/types';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useAgentStore, useAgentStoreApi, useRequestClient } from '@/store';
import { useChunksUISync } from '../useChunksUISync';
import eventBus from '@/utils/eventBus';
import { useChunkParser } from './core/useChunkParser';
import { useSSEHandler } from './core/useSSEHandler';
import { useSend } from './core/useSend';
import { useSendContinue } from './core/useSendContinue';
import { useSessionManager } from './core/useSessionManager';
import { useSessionInfoPoller } from './core/useSessionInfoPoller';
import { useNetworkRecovery } from './network/useNetworkRecovery';

export type SendContent = string | boolean | string[] | HitlApprovalResumeContent;

export interface SendOptions {
  type?: 'user_message' | 'custom_action' | 'client_tool_result';
  params?: any;
  content: string;
  resumeContent?: SendContent;
  files?: FileItem[];
  knowledgeBases?: KnowledgeBaseItem[];
  models?: ModelItem[];
  mode?: string;
  generalAgentMode?: string;
  options?: Record<string, any>;
  metadata?: MessageMetadata;
  mentions?: Mention[];
}

interface UseChatReturn {
  /**
   * Send a message
   */
  send: (options: SendOptions) => Promise<void>;

  /**
   * Stop the task via the stop API instead of aborting SSE
   */
  stop: () => void;
}

/**
 * Call functions via the hook
 * Read data from the store
 */
const useChat = (_basePath: string, _agentId: string, sessionId: string): UseChatReturn => {
  const storeApi = useAgentStoreApi();
  const requestClient = useRequestClient();
  const { instanceId } = storeApi.getState();
  const requestConfig = useAgentStore((state) => state.requestConfig);
  const enableSendContinue = Boolean(
    requestConfig?.capabilities?.sessionRest ?? requestConfig?.adapter?.capabilities?.sessionRest,
  );

  const runAfterSend = useRef<() => void>(() => {});

  // stores
  const chunks = storeApi.getState().chunks;

  // states

  // Use chunks from the global store
  useChunksUISync(chunks);

  // refs

  // Retry timer
  const retryTimerRef = useRef<number | null>(null);

  // Chunk batch timer
  const debounceTimerRef = useRef<number>(0);

  // Keep the last user message
  const currentMessageRef = useRef<string>('');
  // Keep the latest sessionId in a ref to avoid stale closures
  const sessionIdRef = useRef<string>(sessionId);
  const sendRef = useRef<((options: SendOptions) => Promise<void>) | null>(null);

  // Parse chunks with useChunkParser
  const { handleChunk, addPendingChunks, pendingChunks } = useChunkParser({
    storeApi,
    currentMessageRef,
  });

  const { markCreated, startIfPending, stop: stopSessionInfoPoll } = useSessionInfoPoller({
    sessionIdRef,
    storeApi,
  });

  /**
   * Stable functions
   */
  const onSendComplete = useCallback(() => {
    storeApi.getState().setStopped(true);
    // If senderSending is true, set it to false
    if (storeApi.getState().senderSending) {
      storeApi.getState().setSenderSending(false);
    }
    // If senderStopping is true, set it to false
    if (storeApi.getState().senderStopping) {
      storeApi.getState().setSenderStopping(false);
    }
    // Clear the retry timer if present
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    runAfterSend.current();
    runAfterSend.current = () => {};
    void startIfPending();
  }, [storeApi, startIfPending]);

  // Handle SSE with useSSEHandler
  const { handleResponse } = useSSEHandler({
    storeApi,
    debounceTimerRef,
    retryTimerRef,
    handleChunk,
    addPendingChunks,
    enableSendContinue,
  });

  const { sendContinue } = useSendContinue({
    sessionIdRef,
    storeApi,
    retryTimerRef,
    handleResponse,
    onSendComplete,
    enableSendContinue,
  });

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
    onCleanupPreviousSession: stopSessionInfoPoll,
  });

  const { send } = useSend({
    sessionIdRef,
    currentMessageRef,
    retryTimerRef,
    storeApi,
    handleResponse,
    sendContinue,
    onSendComplete,
    enableSendContinue,
    markSessionCreated: markCreated,
  });

  sendRef.current = send;

  useNetworkRecovery({
    storeApi,
    retryTimerRef,
    sendContinue,
    enableSendContinue,
  });

  const stop = useCallback(() => {
    stopSessionInfoPoll();
    const state = storeApi.getState();
    const currentSessionId =
      sessionIdRef.current || state.sessionInfo?.session_id || '';
    if (currentSessionId) {
      void requestClient.session.stopTask(currentSessionId).catch(() => {
        // Local abort still stops rendering if the stop request fails.
      });
    }
    state.abortController?.abort();
    state.setStopped(true);
  }, [storeApi, requestClient, stopSessionInfoPoll]);

  // effects

  // Update ids in refs
  // useLayoutEffect updates the ref before other effects
  // Keep instance params current before send/stop
  useLayoutEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

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
      // Defer send if already sending
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

  // returns

  return {
    send,
    stop,
  };
};

export default useChat;
