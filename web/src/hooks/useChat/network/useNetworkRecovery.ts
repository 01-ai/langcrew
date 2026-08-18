import { useCallback, useEffect, MutableRefObject } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { isMessageFinish, FAKE_CHUNK_PREFIX, filterFakeChunks } from '../utils';

interface UseNetworkRecoveryProps {
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  retryTimerRef: MutableRefObject<number | null>;
  sendContinue?: (retryCount: number) => Promise<void>;
  enableSendContinue?: boolean;
}

/**
 * Network and session recovery
 * Handle offline, visibility, and focus
 */
export const useNetworkRecovery = ({
  storeApi,
  retryTimerRef,
  sendContinue,
  enableSendContinue = false,
}: UseNetworkRecoveryProps) => {
  const { t } = useTranslation();
  // Session recovery check
  const checkAndResumeSession = useCallback(
    (source: string) => {
      console.log(`[${source}] Checking session status`);

      // Skip recovery while a send is in progress
      if (storeApi.getState().senderSending) {
        console.log(`[${source}] Already sending, skip resume`);
        return;
      }

      const chunks = storeApi.getState().chunks;
      const pipelineMessages = storeApi.getState().pipelineMessages;

      // No messages means the session has not started (or just started)
      if (chunks.length === 0 || pipelineMessages.length === 0) {
        console.log(`[${source}] No messages in session, nothing to resume`);
        return;
      }

      // Get the last message to see if the session ended
      const lastMessage = pipelineMessages[pipelineMessages.length - 1];

      // Recover only if the last message is an unfinished assistant turn
      if (lastMessage.role === 'assistant' && !isMessageFinish(lastMessage)) {
        storeApi.getState().setChunks(filterFakeChunks(chunks));
        if (enableSendContinue && sendContinue) {
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}resuming-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.network.resuming'),
          });
          void sendContinue(0);
        } else {
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}resuming-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.network.resuming'),
          });
        }
      } else {
        console.log(`[${source}] Session already finished, no need to resume`);
      }
    },
    [storeApi, t, enableSendContinue, sendContinue],
  );

  // Abort the current connection
  const abortCurrentConnection = useCallback(
    (source: string) => {
      console.log(`[${source}] Aborting current connection`);
      const abortController = storeApi.getState().abortController;
      if (abortController) {
        console.log('Aborting current connection');
        try {
          abortController.abort();
        } catch (e) {
          // abort may throw; ignore it
        }
        storeApi.getState().setAbortController(null);
        // Clear previous fake messages first
        storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
        storeApi.getState().addChunk({
          id: `${FAKE_CHUNK_PREFIX}interrupted-${Date.now()}`,
          role: 'assistant',
          type: 'live_status',
          content: t('chatbot.task.network.offline'),
        });
      }
      // Clear any pending retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    },
    [storeApi, retryTimerRef, t],
  );

  // Listen for online, visibility, and focus
  // Keep the session healthy whenever the page is visible
  useEffect(() => {
    // Debounce so overlapping events do not recover twice
    let resumeDebounceTimer: number | null = null;

    const debouncedResume = (source: string) => {
      if (resumeDebounceTimer) {
        clearTimeout(resumeDebounceTimer);
      }
      resumeDebounceTimer = window.setTimeout(() => {
        checkAndResumeSession(source);
        resumeDebounceTimer = null;
      }, 500); // 500ms debounce
    };

    // Network disconnected
    const handleOffline = () => {
      abortCurrentConnection('offline');
    };

    // Network recovered
    const handleOnline = () => {
      debouncedResume('online');
    };

    // Visibility change (tab switch, minimize, wake from sleep)
    // Check only when visible; keep background streaming alive
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debouncedResume('visibilitychange');
      }
    };

    // Window focus (returning from another app)
    const handleFocus = () => {
      debouncedResume('focus');
    };

    // Check after load (covers refresh)
    // Note: this also runs once on mount
    const handlePageShow = (event: PageTransitionEvent) => {
      // Also check on bfcache restore
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
