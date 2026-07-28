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
}

/**
 * Loads, cleans up, and switches sessions.
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
}: UseSessionManagerProps) => {
  const requestClient = useRequestClient();
  // Track whether the component has unmounted.
  const isUnmountedRef = useRef(false);

  // Keep sendContinue and enableSendContinue in refs so loadSessionData remains stable.
  const sendContinueRef = useRef(sendContinue);
  const enableSendContinueRef = useRef(enableSendContinue);

  useEffect(() => {
    sendContinueRef.current = sendContinue;
    enableSendContinueRef.current = enableSendContinue;
  }, [sendContinue, enableSendContinue]);
  /**
   * Clean up the previous session state and request.
   */
  const cleanupPreviousSession = useCallback(() => {
    // Clear pending chunks.
    if (debounceTimerRef.current) {
      window.clearInterval(debounceTimerRef.current);
      debounceTimerRef.current = 0;
    }
    pendingChunksRef.current = [];

    // Clear timers.
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    storeApi.getState().resetStore();
  }, [storeApi, pendingChunksRef, debounceTimerRef, retryTimerRef]);

  /**
   * Load session data.
   * @param sessionId - Session ID
   */
  const loadSessionData = useCallback(
    async (sessionId: string) => {
      // Return immediately when sessionId is empty.
      if (!sessionId) {
        return;
      }

      // Stop when the component has unmounted.
      if (isUnmountedRef.current) {
        return;
      }

      // Confirm sessionId still matches before loading to avoid route-switch races.
      if (sessionIdRef.current !== sessionId) {
        return;
      }

      try {
        // Clean up previous session state and requests before loading the new session.
        cleanupPreviousSession();

        // Check again after the asynchronous cleanup.
        if (isUnmountedRef.current) {
          return;
        }

        // Check sessionId again because it may have changed during cleanup.
        if (sessionIdRef.current !== sessionId) {
          return;
        }

        // Load session data from the API.
        const data = await requestClient.getSession(sessionId);

        // Check whether the component unmounted during the request.
        if (isUnmountedRef.current) {
          return;
        }

        // Do not update the store if the user switched sessions while the request was in flight.
        if (sessionIdRef.current !== sessionId) {
          return;
        }

        const session = data.session_info as SessionInfo;
        const sessionChunks = data.messages.reverse();
        storeApi.getState().setSessionInfo(session);
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
          // Use the send function ref to avoid a circular dependency.
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
   * Load session data automatically when sessionId changes.
   */
  useEffect(() => {
    // Embedded and preview modes disable automatic session loading.
    if (!storeApi.getState().sessionConfig.enableSessionLoading) {
      return;
    }

    // Skip data loading when navigate() caused the sessionId change.
    if (storeApi.getState().isNavigating) {
      storeApi.getState().setIsNavigating(false);
      return;
    }

    // Read previousSessionId inside the effect so it is not a dependency.
    const previousSessionId = storeApi.getState().previousSessionId;

    // Skip loading when sessionId has not changed.
    if (previousSessionId === sessionId && sessionId !== '') {
      return;
    }

    // Record the new sessionId.
    storeApi.getState().setPreviousSessionId(sessionId);

    if (sessionId) {
      // Defer until useLayoutEffect has updated sessionIdRef to avoid a route-switch race.
      queueMicrotask(() => {
        loadSessionData(sessionId);
      });
    } else {
      storeApi.getState().resetStore();
    }
  }, [sessionId, storeApi, loadSessionData]);

  /**
   * Mark the component as unmounted.
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
