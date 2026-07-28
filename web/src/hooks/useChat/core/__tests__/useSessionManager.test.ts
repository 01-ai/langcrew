import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionManager } from '../useSessionManager';
import type { MessageChunk, SessionInfo, MessageItem } from '@/types';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/test', search: '', hash: '', state: null }),
}));

// Mock Dependency
const { mockAxiosGet } = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(),
}));

vi.mock('@/services/request', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/request')>();
  const axios = {
    post: vi.fn(),
    get: mockAxiosGet,
  };
  return {
    ...actual,
    axios,
    default: axios,
  };
});

vi.mock('@/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store')>();
  return {
    ...actual,
    useRequestClient: vi.fn(),
  };
});

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    isMessageFinish: vi.fn(),
  };
});

vi.mock('../../transformChunksToMessages', () => ({
  transformChunksToMessages: vi.fn(),
}));

// Import mock Post Module
import { useRequestClient } from '@/store';
import { createRequestClient } from '@/services/requestClient';
import { transformChunksToMessages } from '../../transformChunksToMessages';
import { isMessageFinish } from '../../utils';

describe('useSessionManager', () => {
  let mockStoreApi: any;
  let mockState: any;
  let sessionIdRef: any;
  let debounceTimerRef: any;
  let retryTimerRef: any;
  let pendingChunksRef: any;
  let mockSendContinue: any;
  let sendRef: any;

  beforeEach(() => {
    // Reset All mock
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create Lasting mock Functions
    mockState = {
      agentId: 'test-agent',
      chunks: [],
      isNavigating: false,
      previousSessionId: '',
      requestConfig: {
        extraHeaders: {},
      },
      sessionConfig: { enableRouting: true, enableSessionLoading: true, autoRetryOnArchive: false },
      resetStore: vi.fn(),
      setSessionInfo: vi.fn(),
      setChunks: vi.fn(),
      onSessionLoaded: vi.fn(),
      setIsNavigating: vi.fn(),
      setPreviousSessionId: vi.fn(),
    };

    // Create mock storeApi
    mockStoreApi = {
      getState: vi.fn(() => mockState),
    };

    (useRequestClient as any).mockImplementation(() => createRequestClient(mockStoreApi));

    sessionIdRef = { current: '' };
    debounceTimerRef = { current: 0 };
    retryTimerRef = { current: null };
    pendingChunksRef = { current: [] };
    mockSendContinue = vi.fn();
    sendRef = { current: null };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cleanupPreviousSession', () => {
    it('We should clean up all the timers and things to process. chunks', () => {
      debounceTimerRef.current = 123 as any;
      retryTimerRef.current = 456 as any;
      pendingChunksRef.current = [{ id: '1', role: 'assistant', type: 'text', content: 'test' }];

      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.cleanupPreviousSession();
      });

      // Check cleared. debounce timer
      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      expect(debounceTimerRef.current).toBe(0);

      // Check cleared. retry timer
      expect(clearTimeoutSpy).toHaveBeenCalledWith(456);
      expect(retryTimerRef.current).toBeNull();

      // Check cleared. pending chunks
      expect(pendingChunksRef.current).toEqual([]);

      // Validation reset. store
      expect(mockState.resetStore).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });

    it('Should be safely handled with non-existent timers.', () => {
      debounceTimerRef.current = 0;
      retryTimerRef.current = null;

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.cleanupPreviousSession();
      });

      // Check that no anomalies were dropped
      expect(mockState.resetStore).toHaveBeenCalled();
    });
  });

  describe('loadSessionData', () => {
    it('Session data should be loaded successfully', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Test Session',
        status: 'ACTIVE',
      };

      const mockChunks: MessageChunk[] = [
        { id: '1', role: 'user', type: 'text', content: 'Hello' },
        { id: '2', role: 'assistant', type: 'text', content: 'Hi' },
      ];

      const mockMessages: MessageItem[] = [
        { role: 'user', messages: [mockChunks[0]] },
        { role: 'assistant', messages: [mockChunks[1]] },
      ];

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [...mockChunks],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue(mockMessages);
      (isMessageFinish as any).mockReturnValue(true);

      sessionIdRef.current = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Verify Call getSession
      expect(mockAxiosGet).toHaveBeenCalledWith('/app/api/v1/sessions/session-123/detail', {});

      // Verify set session information
      expect(mockState.setSessionInfo).toHaveBeenCalledWith(mockSession);

      // Checking settings. chunks（Note: Code will do reverse messages）
      expect(mockState.setChunks).toHaveBeenCalledWith(mockChunks);

      // Verify Call transformChunksToMessages
      expect(transformChunksToMessages).toHaveBeenCalledWith(mockChunks);
      expect(mockState.onSessionLoaded).toHaveBeenCalledWith(mockSession, mockChunks);
    });

    it('onSessionLoaded The old session should not be continued after the session has been switched during execution', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Old Session',
        status: 'ACTIVE',
      };
      const mockChunks: MessageChunk[] = [
        { id: '1', role: 'assistant', type: 'text', content: 'Incomplete' },
      ];
      let resolveSessionLoaded!: () => void;
      mockState.onSessionLoaded = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSessionLoaded = resolve;
          }),
      );
      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
            messages: [...mockChunks],
          },
          code: 200,
        },
      });
      sessionIdRef.current = 'session-123';
      mockState.previousSessionId = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      let loading!: Promise<void>;
      await act(async () => {
        loading = result.current.loadSessionData('session-123');
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockState.onSessionLoaded).toHaveBeenCalled();
      sessionIdRef.current = 'session-456';
      await act(async () => {
        resolveSessionLoaded();
        await loading;
      });

      expect(transformChunksToMessages).not.toHaveBeenCalled();
      expect(mockSendContinue).not.toHaveBeenCalled();
    });

    it('If the session is not completed, it should be called sendContinue', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Test Session',
        status: 'ACTIVE',
      };

      const mockChunks: MessageChunk[] = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];

      const mockMessages: MessageItem[] = [{ role: 'assistant', messages: [mockChunks[0]] }];

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [...mockChunks],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue(mockMessages);
      (isMessageFinish as any).mockReturnValue(false); // Not completed

      sessionIdRef.current = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Verify Call sendContinue
      expect(mockSendContinue).toHaveBeenCalledWith(0);
    });

    it('If the session is finished, no call should be made sendContinue', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Test Session',
        status: 'ACTIVE',
      };

      const mockChunks: MessageChunk[] = [{ id: '1', role: 'assistant', type: 'text', content: 'Complete' }];

      const mockMessages: MessageItem[] = [{ role: 'assistant', messages: [mockChunks[0]] }];

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [...mockChunks],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue(mockMessages);
      (isMessageFinish as any).mockReturnValue(true); // Completed

      sessionIdRef.current = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Verify not called sendContinue
      expect(mockSendContinue).not.toHaveBeenCalled();
    });

    it('If the session is empty and in state ACTIVE，Should Send Session Title', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'New Session Title',
        status: 'ACTIVE',
      };

      const mockSend = vi.fn();

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue([]);

      sessionIdRef.current = 'session-123';
      sendRef.current = mockSend;

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Verify Call send Function Send Title
      expect(mockSend).toHaveBeenCalledWith({ content: 'New Session Title' });
    });

    it('If the session is empty but not in state ACTIVE，Should not send title', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Archived Session',
        status: 'ARCHIVED',
      };

      const mockSend = vi.fn();

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue([]);

      sessionIdRef.current = 'session-123';
      sendRef.current = mockSend;

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Verify not called send Functions
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('If sessionId If the request for return changes, loading data should be abandoned', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Test Session',
        status: 'ACTIVE',
      };

      (mockAxiosGet as any).mockImplementation(async () => {
        // Simulate the step delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          data: {
            data: {
              session_info: mockSession,
              messages: [],
            },
            code: 200,
          },
        };
      });

      sessionIdRef.current = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      // Start loading
      act(() => {
        result.current.loadSessionData('session-123');
      });

      // Change before request is completed sessionId
      sessionIdRef.current = 'session-456';

      // Waiting for request to be completed
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Verify not updated store
      expect(mockState.setSessionInfo).not.toHaveBeenCalled();
      expect(mockState.setChunks).not.toHaveBeenCalled();
    });

    it('The case of failure to load should be addressed.', async () => {
      const error = new Error('Failed to load session');
      (mockAxiosGet as any).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      sessionIdRef.current = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Checking logs for errors
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load session data:', error);

      // Verify not updated store
      expect(mockState.setSessionInfo).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('We should clean up the old ones first. session Load new data', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Test Session',
        status: 'ACTIVE',
      };

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue([]);

      sessionIdRef.current = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Validation first. resetStore（Yes. cleanupPreviousSession Medium)
      expect(mockState.resetStore).toHaveBeenCalled();
    });
  });

  describe('useEffect - sessionId Change listening', () => {
    it('embedded Mode: Should not be handled sessionId Change', () => {
      mockState.sessionConfig = { enableRouting: false, enableSessionLoading: false, autoRetryOnArchive: true };

      renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      // Verify not called getSession
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it('page Mode: If isNavigating Yes true，Data should not be loaded', () => {
      mockState.isNavigating = true;

      renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      // Validation reset. isNavigating
      expect(mockState.setIsNavigating).toHaveBeenCalledWith(false);

      // Verify not called getSession
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it('If sessionId No change. No data load.', () => {
      mockState.previousSessionId = 'session-123';

      renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      // Verify not called getSession
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it('If sessionId It\'s empty. We should reset it. store', () => {
      renderHook(() =>
        useSessionManager({
          sessionId: '',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      // Verify Call resetStore
      expect(mockState.resetStore).toHaveBeenCalled();

      // Check for update. previousSessionId
      expect(mockState.setPreviousSessionId).toHaveBeenCalledWith('');
    });

    it('If sessionId Change, new session data should be loaded', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-456',
        title: 'New Session',
        status: 'ACTIVE',
      };

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue([]);

      sessionIdRef.current = 'session-456';

      renderHook(() =>
        useSessionManager({
          sessionId: 'session-456',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      // Wait useEffect Implementation
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Verify Call getSession
      expect(mockAxiosGet).toHaveBeenCalledWith('/app/api/v1/sessions/session-456/detail', {});

      // Check for update. previousSessionId
      expect(mockState.setPreviousSessionId).toHaveBeenCalledWith('session-456');
    });

    it('It should be handled right. previousSessionId and sessionId It\'s empty.', () => {
      mockState.previousSessionId = '';

      renderHook(() =>
        useSessionManager({
          sessionId: '',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      // Verify that resetStore is called without restoring the previous session.
      expect(mockState.resetStore).toHaveBeenCalled();
    });
  });

  describe('Border situation', () => {
    it('It should be handled right. sendRef.current Yes null Situation', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'New Session Title',
        status: 'ACTIVE',
      };

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue([]);

      sessionIdRef.current = 'session-123';
      sendRef.current = null; // sendRef Yes null

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Check that no anomalies were dropped
      expect(mockState.setSessionInfo).toHaveBeenCalled();
    });

    it('It should be handled correctly. user Information', async () => {
      const mockSession: SessionInfo = {
        session_id: 'session-123',
        title: 'Test Session',
        status: 'ACTIVE',
      };

      const mockChunks: MessageChunk[] = [{ id: '1', role: 'user', type: 'text', content: 'Hello' }];

      const mockMessages: MessageItem[] = [{ role: 'user', messages: [mockChunks[0]] }];

      (mockAxiosGet as any).mockResolvedValue({
        data: {
          data: {
            session_info: mockSession,
        messages: [...mockChunks],
          },
          code: 200,
        },
      });

      (transformChunksToMessages as any).mockReturnValue(mockMessages);

      sessionIdRef.current = 'session-123';

      const { result } = renderHook(() =>
        useSessionManager({
          sessionId: 'session-123',
          sessionIdRef,
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          pendingChunksRef,
          sendContinue: mockSendContinue,
          sendRef,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.loadSessionData('session-123');
      });

      // Verify not called sendContinue（Because the last message was, user）
      expect(mockSendContinue).not.toHaveBeenCalled();
    });
  });
});
