import { useCallback, useEffect, MutableRefObject } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { isMessageFinish, FAKE_CHUNK_PREFIX, filterFakeChunks } from '../utils';
import { SendOptions } from '..';

interface UseNetworkRecoveryProps {
  sessionIdRef: MutableRefObject<string>;
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  sendContinue: (retryCount: number) => Promise<void>;
  retryTimerRef: MutableRefObject<number | null>;
  sendRef: MutableRefObject<((options: SendOptions) => Promise<void>) | null>;
  currentMessageRef: MutableRefObject<string>;
  enableSendContinue: boolean;
}

/**
 * Restores sessions after network disconnections, visibility changes, and focus events.
 */
export const useNetworkRecovery = ({
  sessionIdRef,
  storeApi,
  sendContinue,
  retryTimerRef,
  sendRef,
  currentMessageRef,
  enableSendContinue,
}: UseNetworkRecoveryProps) => {
  const { t } = useTranslation();
  // Check whether the current session needs to be resumed.
  const checkAndResumeSession = useCallback(
    (source: string) => {
      console.log(`[${source}] Checking session status`);

      // A sessionId is required for recovery.
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        console.log(`[${source}] No session to resume`);
        return;
      }

      // No recovery is needed while a request is already being sent.
      if (storeApi.getState().senderSending) {
        console.log(`[${source}] Already sending, skip resume`);
        return;
      }

      const chunks = storeApi.getState().chunks;
      const pipelineMessages = storeApi.getState().pipelineMessages;

      // No messages means the session has not started or is empty.
      if (chunks.length === 0 || pipelineMessages.length === 0) {
        console.log(`[${source}] No messages in session, nothing to resume`);
        return;
      }

      // Inspect the last message to determine whether the session finished.
      const lastMessage = pipelineMessages[pipelineMessages.length - 1];

      // Resume only an unfinished assistant message.
      if (lastMessage.role === 'assistant' && !isMessageFinish(lastMessage)) {
        // Exclude temporary chunks and use the last real chunk ID.
        const realChunks = filterFakeChunks(chunks);
        // Find the last assistant chunk ID for send-continue.
        const lastAssistantChunk = realChunks.findLast((c) => c.role === 'assistant');
        const lastRealChunkId = lastAssistantChunk?.id || '';

        console.log(`[${source}] Session not finished, last chunk id:`, lastRealChunkId);

        if (enableSendContinue) {
          console.log(`[${source}] resuming with send-continue`);
          // Remove stale temporary status messages first.
          storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
          // Add a network recovery status message.
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}resuming-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.network.resuming'),
          });
          // Resume with send-continue from the last chunkId.
          sendContinue(0);
        } else {
          console.log(`[${source}] send-continue disabled, skip resume`);
        }
      } else {
        console.log(`[${source}] Session already finished, no need to resume`);
      }
    },
    [sessionIdRef, storeApi, t, sendContinue, enableSendContinue],
  );

  // Abort the current connection.
  const abortCurrentConnection = useCallback(
    (source: string) => {
      console.log(`[${source}] Aborting current connection`);
      const abortController = storeApi.getState().abortController;
      if (abortController) {
        console.log('Aborting current connection');
        try {
          abortController.abort();
        } catch (e) {
          // Ignore errors thrown while aborting the previous request.
        }
        storeApi.getState().setAbortController(null);
        // Remove stale temporary status messages first.
        storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
        storeApi.getState().addChunk({
          id: `${FAKE_CHUNK_PREFIX}interrupted-${Date.now()}`,
          role: 'assistant',
          type: 'live_status',
          content: t('chatbot.task.network.offline'),
        });
      }
      // Clear any pending retry timer.
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    },
    [storeApi, retryTimerRef, t],
  );

  // Monitor network state, page visibility, and focus so visible sessions stay active.
  useEffect(() => {
    // Debounce recovery so multiple events do not trigger duplicate requests.
    let resumeDebounceTimer: number | null = null;

    const debouncedResume = (source: string) => {
      if (resumeDebounceTimer) {
        clearTimeout(resumeDebounceTimer);
      }
      resumeDebounceTimer = window.setTimeout(() => {
        checkAndResumeSession(source);
        resumeDebounceTimer = null;
      }, 500); // 500ms Wrestleproof.
    };

    // Network disconnected.
    const handleOffline = () => {
      abortCurrentConnection('offline');
    };

    // Network restored.
    const handleOnline = () => {
      debouncedResume('online');
    };

    // Check when the page becomes visible after tab changes, window minimization, or system sleep.
    // Do not interrupt a background connection so streaming can continue.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debouncedResume('visibilitychange');
      }
    };

    // Check when the page regains focus.
    const handleFocus = () => {
      debouncedResume('focus');
    };

    // Check after pageshow, including after a page refresh.
    const handlePageShow = (event: PageTransitionEvent) => {
      // Recheck when restoring from the back-forward cache.
      if (event.persisted) {
        debouncedResume('pageshow-bfcache');
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      if (resumeDebounceTimer) {
        clearTimeout(resumeDebounceTimer);
      }
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [checkAndResumeSession, abortCurrentConnection]);

  return {
    checkAndResumeSession,
    abortCurrentConnection,
  };
};
