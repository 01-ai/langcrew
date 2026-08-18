import { useCallback, useRef, MutableRefObject } from 'react';
import { executeClientToolCall } from '@/sdk';
import { isJsonString } from '@/utils/json';
import type { MessageChunk, ClientToolCallChunk, EventErrorChunk } from '@/types';
import eventBus from '@/utils/eventBus';
import { FAKE_USER_MESSAGE_PREFIX } from '../utils/constants';

interface UseChunkParserProps {
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  currentMessageRef: MutableRefObject<string>;
}

const getToolResultContext = (chunk: MessageChunk, sessionId: string) => {
  const detail = (chunk as any).detail ?? {};
  const nestedResult = detail.result;
  const rawStatus = detail.status ?? nestedResult?.status ?? (chunk as any).status;

  return {
    toolName:
      detail.tool ??
      detail.name ??
      detail.action ??
      nestedResult?.tool ??
      nestedResult?.name ??
      '',
    chunk,
    sessionId: chunk.session_id || sessionId,
    status: rawStatus == null ? undefined : String(rawStatus),
    result: nestedResult?.result ?? nestedResult ?? (chunk as any).result,
  };
};

/**
 * Chunk parsing
 * Parse SSE chunks and batch them
 */
export const useChunkParser = ({ storeApi, currentMessageRef }: UseChunkParserProps) => {
  // Pending chunk
  const pendingChunks = useRef<MessageChunk[]>([]);
  const processedClientToolCallIds = useRef<Set<string>>(new Set());

  /**
   * Batch-append pending chunks to the store
   */
  const addPendingChunks = useCallback(() => {
    if (pendingChunks.current.length === 0) {
      return;
    }
    storeApi.getState().addChunks(pendingChunks.current);
    pendingChunks.current = [];
  }, [storeApi]);

  /**
   * Handle a single chunk
   */
  const handleChunk = useCallback(
    async (chunk: string) => {
      if (!isJsonString(chunk)) {
        console.error('handleChunk chunk is not json string', chunk);
        return;
      }
      if (chunk.trim() === '{}') {
        console.log('handleChunk chunk is empty', chunk);
        return;
      }
      const data = JSON.parse(chunk) as MessageChunk;

      storeApi.getState().onChunks?.([data]);
      if (data.type === 'tool_result') {
        try {
          const state = storeApi.getState();
          await state.onToolResult?.(
            getToolResultContext(data, state.sessionId || state.sessionInfo?.session_id || ''),
          );
        } catch (error) {
          console.error('onToolResult callback failed:', error);
        }
      }

      // If send returns a user message (add_message), clear senderLoading
      if (data.role === 'user') {
        const chunks = storeApi.getState().chunks;
        const fakeUserChunks = chunks.filter((chunk) => String(chunk.id).startsWith(FAKE_USER_MESSAGE_PREFIX));
        // Filter chunks with the fake user-message prefix
        const realChunks = chunks.filter((chunk) => !String(chunk.id).startsWith(FAKE_USER_MESSAGE_PREFIX));

        // Server echo may omit detail.mentions; keep optimistic mentions so bubble chips
        // retain tooltip / onClick until the backend returns them.
        let userChunk = data;
        const serverMentions = data.detail?.mentions;
        if (!Array.isArray(serverMentions) || serverMentions.length === 0) {
          const fakeWithMentions = [...fakeUserChunks]
            .reverse()
            .find((chunk) => Array.isArray(chunk.detail?.mentions) && chunk.detail.mentions.length > 0);
          if (fakeWithMentions?.detail?.mentions) {
            userChunk = {
              ...data,
              detail: {
                ...(data.detail || {}),
                mentions: fakeWithMentions.detail.mentions,
              },
            };
          }
        }

        const newChunks = [...realChunks, userChunk];
        storeApi.getState().setChunks(newChunks);
        // Clear senderLoading so a new send is allowed
        storeApi.getState().setSenderLoading(false);
        // Continue: replace the temp chunk with the server user chunk
        return;
      }

      // Handle session-archived errors
      if ((data as EventErrorChunk).code === 4102) {
        const { sessionConfig, instanceId } = storeApi.getState();
        // autoRetryOnArchive=true (embedded): reset the store and start a new session
        if (sessionConfig.autoRetryOnArchive) {
          storeApi.getState().resetStore();
          eventBus.emit(`call_send_${instanceId}`, {
            content: currentMessageRef.current,
          });
          return;
        }
        // Without autoRetryOnArchive: show an error and mark the session archived
        storeApi.getState().addChunk({
          id: Date.now().toString(),
          role: 'assistant',
          type: 'error',
          content: (data as EventErrorChunk).message || 'Session is archived',
        });
        storeApi.getState().setSessionInfo({
          ...storeApi.getState().sessionInfo,
          status: 'ARCHIVED',
        });
        return;
      }
      // Session init
      if (data.type === 'session_init') {
        const {
          detail: { session_id, title },
        } = data;

        storeApi.getState().setSessionInfo({
          session_id,
          title,
        } as any);

        if (storeApi.getState().sessionId !== session_id) {
          storeApi.getState().setSessionId(session_id);
        }

        return;
      }

      // Handle client tool calls
      if (data.type === 'client_tool_call') {
        console.log('client_tool_call', data);
        const toolChunk = data as ClientToolCallChunk;
        const callId = toolChunk.detail?.call_id;
        const initialState = storeApi.getState();
        const storedSessionId = initialState.sessionId || initialState.sessionInfo?.session_id || '';
        const chunkSessionId = toolChunk.session_id || '';
        if (storedSessionId && chunkSessionId && storedSessionId !== chunkSessionId) {
          return;
        }
        const currentSessionId = chunkSessionId || storedSessionId;
        const callKey = callId ? `${currentSessionId}:${callId}` : '';
        if (callKey && processedClientToolCallIds.current.has(callKey)) {
          return;
        }
        if (callKey) {
          processedClientToolCallIds.current.add(callKey);
        }

        const shouldWaitForResult = Boolean(toolChunk.detail?.wait_for_result);
        if (shouldWaitForResult) {
          storeApi.getState().setPendingClientToolResult(true);
        }

        const initialInstanceId = initialState.instanceId;
        const signal = initialState.abortController?.signal ?? new AbortController().signal;
        const context = {
          arguments: toolChunk.detail.arguments,
          chunk: toolChunk,
          agentId: initialState.agentId,
          sessionId: currentSessionId,
          signal,
        };
        const result = await executeClientToolCall(toolChunk, {
          handler: initialState.clientToolHandlers?.[toolChunk.detail.name],
          agentId: context.agentId,
          sessionId: context.sessionId,
          signal,
        });

        console.log('client_tool_result', result);
        const latestState = storeApi.getState();
        const latestStoredSessionId = latestState.sessionId || latestState.sessionInfo?.session_id || '';
        const sessionChanged = storedSessionId
          ? latestStoredSessionId !== storedSessionId
          : Boolean(latestStoredSessionId && latestStoredSessionId !== currentSessionId);
        if (signal.aborted || latestState.instanceId !== initialInstanceId || sessionChanged) {
          if (shouldWaitForResult) {
            latestState.setPendingClientToolResult(false);
          }
          return;
        }

        // Send client_tool_result when a result is expected
        if (shouldWaitForResult && callId) {
          eventBus.emit(`call_send_${initialInstanceId}`, {
            type: 'client_tool_result',
            params: {
              call_id: callId,
              status: result.success ? 'completed' : 'failed',
              output: result.data,
            },
          });
        } else if (shouldWaitForResult) {
          storeApi.getState().setPendingClientToolResult(false);
        }

        return;
      }

      if (data.type === 'generate_title') {
        const title = data.content;
        if (title) {
          storeApi.getState().setSessionInfo({
            ...storeApi.getState().sessionInfo,
            title,
          });
        }
        return;
      }

      // Enqueue as pending
      pendingChunks.current.push(data);
    },
    [storeApi, currentMessageRef],
  );

  return {
    handleChunk,
    addPendingChunks,
    pendingChunks,
  };
};
