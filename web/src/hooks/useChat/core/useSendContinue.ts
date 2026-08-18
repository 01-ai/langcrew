import { useCallback, MutableRefObject } from 'react';
import { useRequestClient } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import { MAX_RETRY_COUNT, RETRY_DELAY, FAKE_CHUNK_PREFIX, filterFakeChunks } from '../utils';
import dayjs from 'dayjs';

interface UseSendContinueProps {
  sessionIdRef: MutableRefObject<string>;
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  retryTimerRef: MutableRefObject<number | null>;
  handleResponse: (response: Response, onTimeout: () => void, onComplete: () => void) => Promise<void>;
  onSendComplete: () => void;
  enableSendContinue: boolean;
}

/**
 * send-continue and retry
 */
export const useSendContinue = ({
  sessionIdRef,
  storeApi,
  retryTimerRef,
  handleResponse,
  onSendComplete,
  enableSendContinue,
}: UseSendContinueProps) => {
  const { t } = useTranslation();
  const requestClient = useRequestClient();
  /**
   * Handle max-retry exhaustion
   */
  const handleRetryMax = useCallback(() => {
    console.error('send-continue reached max retries; stopping');
    storeApi.getState().addChunk({
      id: Date.now().toString(),
      role: 'assistant',
      type: 'error',
      content: t('chatbot.task.reconnect.failed', { count: MAX_RETRY_COUNT }),
    });
    onSendComplete();
  }, [onSendComplete, storeApi, t]);

  /**
   * Send send-continue with retry
   */
  const sendContinue = useCallback(
    async (retryCount = 0) => {
      // Return if send-continue is disabled
      if (!enableSendContinue) {
        console.log('[sendContinue] send-continue disabled; skip');
        onSendComplete();
        return;
      }

      // Debug: print the stack for unexpected calls
      const stack = new Error().stack;
      const stackLines = stack?.split('\n') || [];
      // Caller of sendContinue (skip Error, sendContinue, and the immediate caller)
      const callerInfo = stackLines.slice(3, 6).join('\n');
      console.log(
        `[sendContinue] retryCount=${retryCount}, time=${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')}`,
        '\nstack:\n',
        callerInfo,
      );

      // Send button spins; sending is blocked
      storeApi.getState().setSenderLoading(true);

      // Guard against double-send
      if (storeApi.getState().senderSending) {
        console.log('sendContinue: Already sending, skip');
        storeApi.getState().setSenderLoading(false);
        return;
      }

      // Drop fake status chunks; take the last real chunk id
      const allChunks = storeApi.getState().chunks;
      const realChunks = filterFakeChunks(allChunks);

      const lastRealChunkId = realChunks[realChunks.length - 1]?.id || '';

      // Drop fake chunks to keep the list clean
      if (realChunks.length !== allChunks.length) {
        console.log('Removing fake chunks before send-continue');
        storeApi.getState().setChunks(realChunks);
      }

      try {
        // Abort the previous request safely
        try {
          storeApi.getState().abortController?.abort();
        } catch (e) {
          // abort may throw; ignore it
        }
        const abortController = new AbortController();
        storeApi.getState().setAbortController(abortController);
        storeApi.getState().setSenderSending(true);
        const loadingId = `${FAKE_CHUNK_PREFIX}loading-${Date.now()}`;
        // Set loading
        storeApi.getState().addChunk({
          id: loadingId,
          role: 'assistant',
          type: 'live_status',
          content: t('chatbot.task.server.reconnecting', { current: retryCount + 1, max: MAX_RETRY_COUNT }),
        });
        const response = await requestClient.sendContinue(
          sessionIdRef.current,
          lastRealChunkId,
          abortController.signal,
        );
        // Clear loading
        storeApi.getState().setChunks(storeApi.getState().chunks.filter((chunk) => chunk.id !== loadingId));
        // Send button stops spinning; sending is allowed
        storeApi.getState().setSenderLoading(false);

        if (!response.ok) {
          throw new Error('Failed to fetch');
        }

        handleResponse(
          response,
          () => {
            if (retryCount < MAX_RETRY_COUNT) {
              sendContinue(retryCount + 1);
            } else {
              handleRetryMax();
            }
          },
          onSendComplete,
        );
      } catch (error) {
        storeApi.getState().setSenderLoading(false);
        storeApi.getState().setSenderSending(false);
        // AbortError means the user cancelled; do not show an error
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was aborted in sendContinue');
          return;
        }

        console.error('send-continue error', error);

        // Check network status
        if (!navigator.onLine) {
          // Offline: notify the user; wait for the online event
          console.log('Network is offline, waiting for reconnection');
          // Clear previous fake messages first
          storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}offline-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.network.offline'),
          });
          // Do not schedule retry; wait for the online event
          return;
        }

        if (retryCount < MAX_RETRY_COUNT) {
          // Clear previous fake messages first
          storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
          // Add live_status for reconnect; does not block later retries
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}retry-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.server.reconnecting', {
              current: retryCount + 1,
              max: MAX_RETRY_COUNT,
            }),
          });

          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          retryTimerRef.current = window.setTimeout(() => {
            sendContinue(retryCount + 1);
          }, RETRY_DELAY) as any;
        } else {
          // Max retries reached; show an error
          handleRetryMax();
        }
      }
    },
    [
      enableSendContinue,
      storeApi,
      requestClient,
      onSendComplete,
      t,
      sessionIdRef,
      handleResponse,
      handleRetryMax,
      retryTimerRef,
    ],
  );

  return {
    sendContinue,
    handleRetryMax,
  };
};
