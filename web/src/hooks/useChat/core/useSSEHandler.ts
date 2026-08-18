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
 * SSE stream handling
 * Handle SSE, chunk batching, and error recovery
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
   * Handle the SSE response stream
   * @param response - fetch Response
   * @param onTimeout - timeout callback (retry)
   * @param onComplete - done callback (cleanup)
   */
  const handleResponse = useCallback(
    async (response: Response, onTimeout: () => void, onComplete: () => void) => {
      // Start the batch timer
      if (!debounceTimerRef.current) {
        debounceTimerRef.current = window.setInterval(() => {
          addPendingChunks();
          debounceTimerRef.current = 0;
        }, DEBOUNCE_TIME);
      }

      // Whether this was an intentional abort (AbortError)
      let wasAborted = false;

      try {
        // Iterate the SSE stream
        for await (const chunk of XStream({
          readableStream: response.body,
        })) {
          await handleChunk(chunk.data);
        }
      } catch (error) {
        // If aborted on purpose, skip retry and let the online event recover
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('SSE stream was aborted in handleResponse');
          wasAborted = true;
        } else {
          // Re-throw other errors
          throw error;
        }
      } finally {
        // Always clear timers and flush cached chunks, even on error
        if (debounceTimerRef.current) {
          window.clearInterval(debounceTimerRef.current);
          debounceTimerRef.current = 0;
        }
        // Flush pending chunks so none are dropped
        addPendingChunks();

        // If aborted on purpose, do not retry; let the online event recover
        if (wasAborted) {
          onComplete();
        } else {
          // Check whether the session actually ended
          // Stream ended without a finish chunk → abnormal disconnect
          // Retry to restore the session
          const pipelineMessages = storeApi.getState().pipelineMessages;
          const chunks = storeApi.getState().chunks;
          const lastMessage = pipelineMessages[pipelineMessages.length - 1];
          const isWaitingForClientToolResult = storeApi.getState().pendingClientToolResult;

          // Treat as an abnormal disconnect only if messages exist, last is assistant, and there is no finish flag
          if (isWaitingForClientToolResult) {
            console.log('SSE stream ended while waiting for client tool result');
            onComplete();
          } else if (chunks.length > 0 && lastMessage?.role === 'assistant' && !isMessageFinish(lastMessage)) {
            console.log('SSE stream ended but session not finished');
            // Reset send state first
            onComplete();

            if (enableSendContinue) {
              console.log('scheduling retry with send-continue');
              // Clear previous fake messages first
              storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
              // Add a disconnect notice
              storeApi.getState().addChunk({
                id: `${FAKE_CHUNK_PREFIX}interrupted-${Date.now()}`,
                role: 'assistant',
                type: 'live_status',
                content: t('chatbot.task.connection.interrupted'),
              });
              // Delay retry to avoid a tight loop (server may close after an empty response)
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
