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
 * send-continue requests and retry logic.
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
   * Handle reaching the maximum retry count.
   */
  const handleRetryMax = useCallback(() => {
    console.error('send-continue Maximum number of retries reached, stop retries');
    storeApi.getState().addChunk({
      id: Date.now().toString(),
      role: 'assistant',
      type: 'error',
      content: t('chatbot.task.reconnect.failed', { count: MAX_RETRY_COUNT }),
    });
    onSendComplete();
  }, [onSendComplete, storeApi, t]);

  /**
   * Send a send-continue request with retry support.
   */
  const sendContinue = useCallback(
    async (retryCount = 0) => {
      // Return immediately when send-continue is disabled.
      if (!enableSendContinue) {
        console.log('[sendContinue] send-continue Disabled, Skipped');
        onSendComplete();
        return;
      }

      // Print a call stack to help locate unexpected calls while debugging.
      const stack = new Error().stack;
      const stackLines = stack?.split('\n') || [];
      // Skip Error and sendContinue frames to show the caller.
      const callerInfo = stackLines.slice(3, 6).join('\n');
      console.log(
        `[sendContinue] retryCount=${retryCount}, time=${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')}`,
        '\nCall Inn:\n',
        callerInfo,
      );

      // Start the sender loading indicator.
      storeApi.getState().setSenderLoading(true);

      // Prevent duplicate requests while one is already being sent.
      if (storeApi.getState().senderSending) {
        console.log('sendContinue: Already sending, skip');
        storeApi.getState().setSenderLoading(false);
        return;
      }

      // Use the last real chunk ID, excluding temporary status chunks.
      const allChunks = storeApi.getState().chunks;
      const realChunks = filterFakeChunks(allChunks);

      const lastRealChunkId = realChunks[realChunks.length - 1]?.id || '';

      // Remove temporary chunks before continuing.
      if (realChunks.length !== allChunks.length) {
        console.log('Removing fake chunks before send-continue');
        storeApi.getState().setChunks(realChunks);
      }

      try {
      // Abort the previous request safely.
        try {
          storeApi.getState().abortController?.abort();
        } catch (e) {
          // Ignore errors thrown while aborting the previous request.
        }
        const abortController = new AbortController();
        storeApi.getState().setAbortController(abortController);
        storeApi.getState().setSenderSending(true);
        const loadingId = `${FAKE_CHUNK_PREFIX}loading-${Date.now()}`;
        // Add the loading status.
        storeApi.getState().addChunk({
          id: loadingId,
          role: 'assistant',
          type: 'live_status',
          content: t('chatbot.task.server.reconnecting', { current: retryCount + 1, max: MAX_RETRY_COUNT }),
        });
        const response = await fetch(`/app/api/v1/sessions/${sessionIdRef.current}/send-continue`, {
          method: 'POST',
          headers: requestClient.getCommonRequestHeaders({
            accept: 'text/event-stream',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            chunk_id: lastRealChunkId,
          }),
          signal: abortController.signal,
        });
        // Remove the loading status.
        storeApi.getState().setChunks(storeApi.getState().chunks.filter((chunk) => chunk.id !== loadingId));
        // Stop the loading indicator and allow sending again.
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
        // AbortError means the user stopped the request, so no error message is needed.
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was aborted in sendContinue');
          return;
        }

        console.error('send-continue error', error);

        // Check network status.
        if (!navigator.onLine) {
          // Report the disconnection and wait for the online event instead of retrying here.
          console.log('Network is offline, waiting for reconnection');
          // Remove stale temporary status messages first.
          storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}offline-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.network.offline'),
          });
          // Let the online event trigger recovery instead of scheduling a retry.
          return;
        }

        if (retryCount < MAX_RETRY_COUNT) {
          // Remove stale temporary status messages first.
          storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
          // Add a live_status message about reconnecting without blocking later retries.
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
          // Display an error after the maximum retry count is reached.
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
