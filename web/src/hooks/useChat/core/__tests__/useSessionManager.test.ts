import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentStore } from '@/store/agent';
import { useSessionManager } from '../useSessionManager';

const getSession = vi.fn();

vi.mock('@/store', () => ({
  useRequestClient: () => ({
    capabilities: () => ({ sessionRest: false }),
    getSession,
  }),
}));

describe('useSessionManager', () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it('does not load session history without the sessionRest capability', async () => {
    const storeApi = createAgentStore('session-manager-oss');
    storeApi.getState().setSessionConfig({
      enableRouting: true,
      enableSessionLoading: true,
      autoRetryOnArchive: false,
      enableFeedback: false,
    });

    renderHook(() =>
      useSessionManager({
        sessionId: 'session-1',
        sessionIdRef: { current: 'session-1' },
        storeApi,
        debounceTimerRef: { current: 0 },
        retryTimerRef: { current: null },
        pendingChunksRef: { current: [] },
        sendContinue: vi.fn(),
        sendRef: { current: null },
        enableSendContinue: false,
      }),
    );

    await waitFor(() => {
      expect(storeApi.getState().previousSessionId).toBe('session-1');
    });
    expect(getSession).not.toHaveBeenCalled();
  });
});
