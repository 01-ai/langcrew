import { useCallback, useEffect, useRef, MutableRefObject } from 'react';
import { useRequestClient } from '@/store';

export const SESSION_INFO_POLL_INTERVAL_MS = 2000;
export const SESSION_INFO_POLL_MAX_ATTEMPTS = 10;

interface PendingSessionInfoPoll {
  sessionId: string;
  initialTitle: string;
}

interface UseSessionInfoPollerProps {
  sessionIdRef: MutableRefObject<string>;
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
}

// Survives route remount after createSession → navigate. Keyed by storeApi so
// multiple AgentX instances stay isolated while the same instance can resume.
const pendingPolls = new WeakMap<object, PendingSessionInfoPoll>();

/**
 * After a newly created session's first SSE round completes, poll session detail
 * until the async title is ready (or we hit the attempt limit).
 * Only updates sessionInfo — never reloads messages.
 */
export const useSessionInfoPoller = ({ sessionIdRef, storeApi }: UseSessionInfoPollerProps) => {
  const requestClient = useRequestClient();
  const requestClientRef = useRef(requestClient);
  const storeApiRef = useRef(storeApi);
  const pendingRef = useRef<PendingSessionInfoPoll | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const attemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const pollRef = useRef<() => Promise<void>>(async () => {});
  const startIfPendingRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    requestClientRef.current = requestClient;
    storeApiRef.current = storeApi;
  }, [requestClient, storeApi]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    pendingPolls.delete(storeApiRef.current);
    pendingRef.current = null;
    attemptsRef.current = 0;
    inFlightRef.current = false;
    clearTimer();
  }, [clearTimer]);

  const scheduleNext = useCallback(() => {
    if (!pendingRef.current || isUnmountedRef.current) {
      return;
    }
    if (attemptsRef.current >= SESSION_INFO_POLL_MAX_ATTEMPTS) {
      stop();
      return;
    }
    timerRef.current = window.setTimeout(() => {
      void pollRef.current();
    }, SESSION_INFO_POLL_INTERVAL_MS);
  }, [stop]);

  const poll = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || isUnmountedRef.current) {
      return;
    }
    if (sessionIdRef.current !== pending.sessionId) {
      stop();
      return;
    }
    if (inFlightRef.current) {
      return;
    }
    if (attemptsRef.current >= SESSION_INFO_POLL_MAX_ATTEMPTS) {
      stop();
      return;
    }

    inFlightRef.current = true;
    attemptsRef.current += 1;

    if (!requestClientRef.current.capabilities().sessionRest) {
      inFlightRef.current = false;
      stop();
      return;
    }

    try {
      const data = await requestClientRef.current.getSession(pending.sessionId);
      if (isUnmountedRef.current) {
        // Route remounted; let the new instance resume from persisted pending.
        return;
      }
      if (sessionIdRef.current !== pending.sessionId || pendingRef.current?.sessionId !== pending.sessionId) {
        stop();
        return;
      }

      const sessionInfo = data?.session_info;
      if (sessionInfo && sessionInfo.title !== pending.initialTitle) {
        storeApiRef.current.getState().setSessionInfo(sessionInfo);
        stop();
        return;
      }
    } catch (error) {
      console.error('Failed to poll session info:', error);
    } finally {
      inFlightRef.current = false;
    }

    if (isUnmountedRef.current) {
      return;
    }
    scheduleNext();
  }, [sessionIdRef, stop, scheduleNext]);

  pollRef.current = poll;

  const markCreated = useCallback(
    (sessionId: string, initialTitle: string) => {
      if (!requestClientRef.current.capabilities().sessionRest) {
        return;
      }
      stop();
      const pending = { sessionId, initialTitle };
      pendingRef.current = pending;
      pendingPolls.set(storeApiRef.current, pending);
    },
    [stop],
  );

  const startIfPending = useCallback(async () => {
    if (!requestClientRef.current.capabilities().sessionRest) {
      return;
    }
    const pending = pendingRef.current ?? pendingPolls.get(storeApiRef.current) ?? null;
    if (!pending) {
      return;
    }
    pendingRef.current = pending;
    if (sessionIdRef.current !== pending.sessionId) {
      stop();
      return;
    }
    const currentTitle = storeApiRef.current.getState().sessionInfo?.title;
    if (currentTitle !== undefined && currentTitle !== pending.initialTitle) {
      stop();
      return;
    }
    attemptsRef.current = 0;
    await poll();
  }, [sessionIdRef, poll, stop]);

  startIfPendingRef.current = startIfPending;

  useEffect(() => {
    isUnmountedRef.current = false;
    storeApiRef.current = storeApi;

    const persisted = pendingPolls.get(storeApi);
    if (persisted) {
      pendingRef.current = persisted;
      if (!storeApi.getState().senderSending) {
        void startIfPendingRef.current();
      }
    }

    const unsubscribe = storeApi.subscribe((state, prevState) => {
      if (prevState.senderSending && !state.senderSending) {
        void startIfPendingRef.current();
      }
    });

    return () => {
      isUnmountedRef.current = true;
      unsubscribe();
      clearTimer();
      inFlightRef.current = false;
    };
  }, [storeApi, clearTimer]);

  return {
    markCreated,
    startIfPending,
    stop,
  };
};
