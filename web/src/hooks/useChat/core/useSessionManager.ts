import { useCallback, useEffect, useRef, MutableRefObject } from 'react';
import { useRequestClient } from '@/store';
import { transformChunksToMessages } from '../transformChunksToMessages';
import { isMessageFinish } from '../utils';
import type { MessageChunk, SessionInfo } from '@/types';

interface UseSessionManagerProps {
  sessionId: string;
  sessionIdRef: MutableRefObject<string>;
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  debounceTimerRef: MutableRefObject<number>;
  retryTimerRef: MutableRefObject<number | null>;
  pendingChunksRef: MutableRefObject<MessageChunk[]>;
  sendContinue: (retryCount: number) => Promise<void>;
  sendRef: MutableRefObject<((options: any) => Promise<void>) | null>;
  enableSendContinue: boolean;
  onCleanupPreviousSession?: () => void;
}

/**
 * Session management
 * Load, clean up, and switch sessions
 */
export const useSessionManager = ({
  sessionId,
  sessionIdRef,
  storeApi,
  debounceTimerRef,
  retryTimerRef,
  pendingChunksRef,
  sendContinue,
  sendRef,
  enableSendContinue,
  onCleanupPreviousSession,
}: UseSessionManagerProps) => {
  const requestClient = useRequestClient();
  // Track whether the component unmounted
  const isUnmountedRef = useRef(false);

  // Keep sendContinue / enableSendContinue in refs so loadSessionData stays stable
  const sendContinueRef = useRef(sendContinue);
  const enableSendContinueRef = useRef(enableSendContinue);
  const onCleanupPreviousSessionRef = useRef(onCleanupPreviousSession);

  useEffect(() => {
    sendContinueRef.current = sendContinue;
    enableSendContinueRef.current = enableSendContinue;
  }, [sendContinue, enableSendContinue]);

  useEffect(() => {
    onCleanupPreviousSessionRef.current = onCleanupPreviousSession;
  }, [onCleanupPreviousSession]);
  /**
   * Clean up the previous session's state and requests
   */
  const cleanupPreviousSession = useCallback(() => {
    onCleanupPreviousSessionRef.current?.();

    // Clear pending chunks
    if (debounceTimerRef.current) {
      window.clearInterval(debounceTimerRef.current);
      debounceTimerRef.current = 0;
    }
    pendingChunksRef.current = [];

    // Clear the timeout
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    storeApi.getState().resetStore();
  }, [storeApi, pendingChunksRef, debounceTimerRef, retryTimerRef]);

  /**
   * Load session data
   * @param sessionId - session id
   */
  const loadSessionData = useCallback(
    async (sessionId: string) => {
      // Return if sessionId is empty
      if (!sessionId) {
        return;
      }

      // Skip load if already unmounted
      if (isUnmountedRef.current) {
        return;
      }

      // Recheck sessionId before load (avoid route-switch races)
      if (sessionIdRef.current !== sessionId) {
        return;
      }

      try {
        // Clean previous session state/requests so they do not leak
        cleanupPreviousSession();

        // Recheck unmounted (cleanup is async)
        if (isUnmountedRef.current) {
          return;
        }

        // Recheck sessionId (cleanup may race with a switch)
        if (sessionIdRef.current !== sessionId) {
          return;
        }

        // Fetch session data from the API
        if (!requestClient.capabilities().sessionRest) {
          return;
        }

        const data = await requestClient.getSession(sessionId);

        // Check whether the component unmounted during the request
        if (isUnmountedRef.current) {
          return;
        }

        // Check whether sessionId changed before the response arrived
        // If it changed, the user switched/left; do not update the store
        if (sessionIdRef.current !== sessionId) {
          return;
        }

        const session = data.session_info as SessionInfo;
        const sessionChunks = data.messages.reverse();
        storeApi.getState().setSessionInfo(session);
        storeApi.getState().setFeedbackMap(data.feedback ?? {});
        storeApi.getState().setChunks([...sessionChunks]);

        try {
          await storeApi.getState().onSessionLoaded?.(session, sessionChunks);
        } catch (error) {
          console.error('onSessionLoaded callback failed:', error);
        }

        if (isUnmountedRef.current || sessionIdRef.current !== sessionId) {
          return;
        }

        const newMessages = transformChunksToMessages(sessionChunks);
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant' && !isMessageFinish(lastMessage)) {
            if (enableSendContinueRef.current) {
              sendContinueRef.current(0);
            }
          }
        }
        if (newMessages.length === 0 && session.status === 'ACTIVE') {
          // Use the send function from a ref to avoid a cycle
          if (sendRef.current) {
            sendRef.current({ content: session.title });
          }
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    },
    [cleanupPreviousSession, storeApi, requestClient, sessionIdRef, sendRef],
  );

  /**
   * Watch sessionId and load session data
   */
  useEffect(() => {
    // enableSessionLoading=false (embedded/preview): skip sessionId-change handling
    if (!storeApi.getState().sessionConfig.enableSessionLoading) {
      return;
    }

    // Skip load when sessionId changed due to navigate
    if (storeApi.getState().isNavigating) {
      storeApi.getState().setIsNavigating(false);
      return;
    }

    // Read previousSessionId inside the effect; do not depend on it
    const previousSessionId = storeApi.getState().previousSessionId;

    // Skip load when sessionId is unchanged
    if (previousSessionId === sessionId && sessionId !== '') {
      return;
    }

    // Update previousSessionId
    storeApi.getState().setPreviousSessionId(sessionId);

    if (sessionId) {
      // Defer with queueMicrotask so sessionIdRef is updated by useLayoutEffect
      // Avoid races during React route changes
      queueMicrotask(() => {
        loadSessionData(sessionId);
      });
    } else {
      storeApi.getState().resetStore();
    }
  }, [sessionId, storeApi, loadSessionData]);

  /**
   * Set the unmounted flag on unmount
   */
  useEffect(() => {
    isUnmountedRef.current = false;

    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  return {
    cleanupPreviousSession,
    loadSessionData,
  };
};
