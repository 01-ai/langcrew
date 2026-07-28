import { useCallback, MutableRefObject } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { XStream } from '@ant-design/x-sdk';
import { DEBOUNCE_TIME, RETRY_DELAY, FAKE_CHUNK_PREFIX, isMessageFinish, filterFakeChunks } from '../utils';

interface UseSSEHandlerProps {
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  debounceTimerRef: MutableRefObject<number>;
  retryTimerRef: MutableRefObject<number | null>;
  handleChunk: (chunk: string) => Promise<void>;
  addPendingChunks: () => void;
  enableSendContinue: boolean;
}

/**
 * Processes server-sent event streams, batches chunks, and recovers from interruptions.
 */
export const useSSEHandler = ({
  storeApi,
  debounceTimerRef,
  retryTimerRef,
  handleChunk,
  addPendingChunks,
  enableSendContinue,
}: UseSSEHandlerProps) => {
  const { t } = useTranslation();

  /**
   * Process an SSE response stream.
   * @param response - Fetch response object.
   * @param onTimeout - Callback that triggers a retry after an interrupted stream.
   * @param onComplete - Callback that clears completion state.
   */
  const handleResponse = useCallback(
    async (response: Response, onTimeout: () => void, onComplete: () => void) => {
      // Start batch timer
      if (!debounceTimerRef.current) {
        debounceTimerRef.current = window.setInterval(() => {
          addPendingChunks();
          debounceTimerRef.current = 0;
        }, DEBOUNCE_TIME);
      }

      // Track whether the stream was actively interrupted with AbortError.
      let wasAborted = false;

      try {
        // Consume the SSE stream.
        for await (const chunk of XStream({
          readableStream: response.body,
        })) {
          await handleChunk(chunk.data);
        }
      } catch (error) {
        // Do not retry an explicit abort; the online event handles network recovery.
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('SSE stream was aborted in handleResponse');
          wasAborted = true;
        } else {
          // Re-throw all other errors to the caller.
          throw error;
        }
      } finally {
        // Always clear timers and flush cached chunks, even after an error.
        if (debounceTimerRef.current) {
          window.clearInterval(debounceTimerRef.current);
          debounceTimerRef.current = 0;
        }
        // Flush all pending chunks so no data is lost.
        addPendingChunks();

        // Do not retry an explicit abort; let the online event trigger recovery.
        if (wasAborted) {
          onComplete();
        } else {
          // If the stream ends before a finish chunk arrives, retry to resume the session.
          const pipelineMessages = storeApi.getState().pipelineMessages;
          const chunks = storeApi.getState().chunks;
          const lastMessage = pipelineMessages[pipelineMessages.length - 1];
          const isWaitingForClientToolResult = storeApi.getState().pendingClientToolResult;

          // Retry only when the last message is an unfinished assistant message.
          if (isWaitingForClientToolResult) {
            console.log('SSE stream ended while waiting for client tool result');
            onComplete();
          } else if (chunks.length > 0 && lastMessage?.role === 'assistant' && !isMessageFinish(lastMessage)) {
            console.log('SSE stream ended but session not finished');
            // Reset sender state.
            onComplete();

            if (enableSendContinue) {
              console.log('scheduling retry with send-continue');
              // Remove stale temporary status messages first.
              storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
              // Add a connection-interrupted status message.
              storeApi.getState().addChunk({
                id: `${FAKE_CHUNK_PREFIX}interrupted-${Date.now()}`,
                role: 'assistant',
                type: 'live_status',
                content: t('chatbot.task.connection.interrupted'),
              });
              // Delay the retry to avoid a tight loop when the server immediately closes an empty response.
              if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
              }
              retryTimerRef.current = window.setTimeout(() => {
                console.log('[useSSEHandler] SSE retry timer fired, calling onTimeout (will trigger sendContinue)');
                retryTimerRef.current = null;
                onTimeout();
              }, RETRY_DELAY) as any;
            } else {
              console.log('send-continue disabled, skip retry');
            }
          } else {
            onComplete();
          }
        }
      }
    },
    [storeApi, debounceTimerRef, retryTimerRef, handleChunk, addPendingChunks, t, enableSendContinue],
  );

  return {
    handleResponse,
  };
};
