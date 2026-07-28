import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSendContinue } from '../useSendContinue';
import type { MessageChunk } from '@/types';
import { FAKE_CHUNK_PREFIX, MAX_RETRY_COUNT, RETRY_DELAY } from '../../utils/constants';

// Mock Dependency
vi.mock('@/services/request', () => ({
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  getCommonRequestHeaders: vi.fn((additionalHeaders?: Record<string, string>) => ({
    'csrf-token': 'mock-csrf-token',
    language: 'zh',
    'accept-language': 'zh',
    ...additionalHeaders,
  })),
  request: {
    defaults: {
      baseURL: 'http://localhost:3000',
    },
  },
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'chatbot.task.reconnect.failed': `Connection failed, try again ${params?.count || 0} Number of times`,
        'chatbot.task.server.reconnecting': `Server connection is down, reconnecting.... (${params?.current || 0}/${params?.max || 0})`,
        'chatbot.task.network.offline': 'The network is disconnected. Check the network connection. The network will continue automatically when restored...',
      };
      return translations[key] || key;
    },
  }),
  getLanguage: vi.fn(() => 'zh'),
}));

vi.mock('dayjs', () => {
  const mockDayjs = vi.fn(() => ({
    format: vi.fn(() => '2024-01-01 12:00:00.000'),
  }));
  return { default: mockDayjs };
});

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('useSendContinue', () => {
  let mockStoreApi: any;
  let mockState: any;
  let sessionIdRef: any;
  let retryTimerRef: any;
  let mockHandleResponse: any;
  let mockOnSendComplete: any;

  beforeEach(() => {
    // Reset All mock
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create Lasting mock Functions
    mockState = {
      chunks: [],
      senderSending: false,
      senderLoading: false,
      requestConfig: {
        extraHeaders: {},
      },
      addChunk: vi.fn(),
      setChunks: vi.fn(),
      setSenderLoading: vi.fn(),
      setSenderSending: vi.fn(),
      setAbortController: vi.fn(),
      abortController: null,
    };

    // Create mock storeApi
    mockStoreApi = {
      getState: vi.fn(() => mockState),
    };

    sessionIdRef = { current: 'session-123' };
    retryTimerRef = { current: null };
    mockHandleResponse = vi.fn();
    mockOnSendComplete = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic functions', () => {
    it('Should be sent successfully send-continue Request', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Verify fetch Call
      expect(global.fetch).toHaveBeenCalledWith(
        '/app/api/v1/sessions/session-123/send-continue',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            accept: 'text/event-stream',
            'csrf-token': 'mock-csrf-token',
            'Content-Type': 'application/json',
            language: 'zh',
            'accept-language': 'zh',
          }),
          body: JSON.stringify({
            chunk_id: 'chunk-1',
          }),
          signal: expect.any(AbortSignal),
        }),
      );

      // Verify handleResponse Called
      expect(mockHandleResponse).toHaveBeenCalledWith(mockResponse, expect.any(Function), mockOnSendComplete);

      // Verify Status Update
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(true);
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      expect(mockState.setSenderSending).toHaveBeenCalledWith(true);
    });

    it('It should be filtered out. chunk And use the last real chunk It\'s... id', async () => {
      const fakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}loading-123`,
        role: 'assistant',
        type: 'live_status',
        content: 'Loading...',
      };

      const realChunk1: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Message 1',
      };

      const realChunk2: MessageChunk = {
        id: 'chunk-2',
        role: 'assistant',
        type: 'text',
        content: 'Message 2',
      };

      mockState.chunks = [fakeChunk, realChunk1, realChunk2];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // The verification used the last real thing. chunk its id
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chunk_id: 'chunk-2',
          }),
        }),
      );

      // Verify chunk Deleted
      expect(mockState.setChunks).toHaveBeenCalledWith([realChunk1, realChunk2]);
    });

    it('There\'s no truth. chunk Use empty string as chunk_id', async () => {
      const fakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}loading-123`,
        role: 'assistant',
        type: 'live_status',
        content: 'Loading...',
      };

      mockState.chunks = [fakeChunk];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chunk_id: '',
          }),
        }),
      );
    });

    it('Should be added and deleted loading Status chunk', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Verification added loading chunk
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}loading-`),
          role: 'assistant',
          type: 'live_status',
        }),
      );

      // The authentication was deleted. loading chunk
      expect(mockState.setChunks).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({
            id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}loading-`),
          }),
        ]),
      );
    });
  });

  describe('duplicate-request protection', () => {
    it('If already sent, skip and reset loading', async () => {
      mockState.senderSending = true;
      mockState.chunks = [{ id: 'chunk-1', role: 'assistant', type: 'text', content: 'Hello' }];

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Checking settings. loading
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(true);
      // Validation reset. loading（Because I jumped.
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      // Verify not called fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('It should be handled. fetch Failures', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const mockResponse = {
        ok: false,
        status: 500,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Verify reset status
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      expect(mockState.setSenderSending).toHaveBeenCalledWith(false);
      // Verify not called handleResponse
      expect(mockHandleResponse).not.toHaveBeenCalled();
    });

    it('It should be handled. AbortError', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      (global.fetch as any).mockRejectedValue(abortError);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Verify reset status
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      expect(mockState.setSenderSending).toHaveBeenCalledWith(false);
      // Check logs
      expect(consoleLogSpy).toHaveBeenCalledWith('Request was aborted in sendContinue');
      // Verify does not add error chunk
      expect(mockState.addChunk).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        }),
      );

      consoleLogSpy.mockRestore();
    });

    it('Should be able to handle the offline situation.', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      // Simulate network offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Check added offline hint
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}offline-`),
          role: 'assistant',
          type: 'live_status',
          content: 'The network is disconnected. Check the network connection. The network will continue automatically when restored...',
        }),
      );

      // Validate no retry timer set
      expect(retryTimerRef.current).toBeNull();

      consoleLogSpy.mockRestore();

      // Restore network status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('Should Add offline Clear old false messages before prompting', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      // Set up old false and real messages
      const oldFakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}retry-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Reconnecting Tip',
      };
      mockState.chunks = [realChunk, oldFakeChunk];

      // Simulate network offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Verify to clear old false messages first (retain the real message)
      expect(mockState.setChunks).toHaveBeenCalled();
      const setChunksCall = mockState.setChunks.mock.calls[0][0];
      // setChunks Now, here's the one that's receiving. filterFakeChunks Results (array)
      expect(setChunksCall).toEqual([realChunk]); // Keep only the real message

      // New as a result of authentication offline Hint
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}offline-`),
          role: 'assistant',
          type: 'live_status',
        }),
      );

      consoleLogSpy.mockRestore();

      // Restore network status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });
  });

  describe('Try Logic Again', () => {
    it('Should Add retry Clear old false messages before prompting', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      // Set up old false and real messages
      const oldFakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}offline-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Offline Hint',
      };
      mockState.chunks = [realChunk, oldFakeChunk];

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Verify to clear old false messages first (retain the real message)
      expect(mockState.setChunks).toHaveBeenCalled();
      const setChunksCall = mockState.setChunks.mock.calls[0][0];
      // setChunks Now, here's the one that's receiving. filterFakeChunks Results (array)
      expect(setChunksCall).toEqual([realChunk]); // Keep only the real message

      // New as a result of authentication retry Hint
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}retry-`),
          role: 'assistant',
          type: 'live_status',
        }),
      );
    });

    it('Retry timers should be set when they fail', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Check Add a retry hint
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}retry-`),
          role: 'assistant',
          type: 'live_status',
        }),
      );

      // Validation settings for retry timers
      expect(retryTimerRef.current).not.toBeNull();

      // Validate timer will be available RETRY_DELAY After Trigger
      act(() => {
        vi.advanceTimersByTime(RETRY_DELAY);
      });

      // Verify is called again sendContinue
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('The number of retries should be passed correctly', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(5);
      });

      // Verifying retry hint shows the correct number
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('6/30'),
        }),
      );
    });

    it('Should be called when the maximum number of retries is reached handleRetryMax', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(MAX_RETRY_COUNT);
      });

      // Verify the expected behavior.
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          type: 'error',
          content: expect.stringContaining(`${MAX_RETRY_COUNT} Number of times`),
        }),
      );

      // Verify Call onSendComplete
      expect(mockOnSendComplete).toHaveBeenCalled();

      // Checking logs for errors
      expect(consoleErrorSpy).toHaveBeenCalledWith('send-continue Maximum number of retries reached, stop retries');

      consoleErrorSpy.mockRestore();
    });

    it('Should clear previous retry timers', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      // Set an existing timer
      retryTimerRef.current = 123 as any;

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Verify clears the previous timer
      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
    });
  });

  describe('handleRetryMax', () => {
    it('Error message should be added and called onSendComplete', () => {
      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.handleRetryMax();
      });

      // Verify the expected behavior.
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          type: 'error',
          content: expect.stringContaining(`${MAX_RETRY_COUNT} Number of times`),
        }),
      );

      // Verify Call onSendComplete
      expect(mockOnSendComplete).toHaveBeenCalled();

      // Checking logs for errors
      expect(consoleErrorSpy).toHaveBeenCalledWith('send-continue Maximum number of retries reached, stop retries');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleResponse callback', () => {
    it('Should trigger a re-test when the flow is interrupted', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      let onTimeoutCallback: (() => void) | null = null;

      mockHandleResponse.mockImplementation((response: Response, onTimeout: () => void) => {
        onTimeoutCallback = onTimeout;
        return Promise.resolve();
      });

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Simulation stream interrupted, trigger. onTimeout
      await act(async () => {
        if (onTimeoutCallback) {
          onTimeoutCallback();
        }
      });

      // Verify is called again sendContinue（Try again)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('Should be called when the maximum number of retries is reached handleRetryMax', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      let onTimeoutCallback: (() => void) | null = null;

      mockHandleResponse.mockImplementation((response: Response, onTimeout: () => void) => {
        onTimeoutCallback = onTimeout;
        return Promise.resolve();
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(MAX_RETRY_COUNT);
      });

      // Simulation stream interrupted, trigger. onTimeout
      await act(async () => {
        if (onTimeoutCallback) {
          onTimeoutCallback();
        }
      });

      // Verify that handleRetryMax is called without another retry.
      expect(mockOnSendComplete).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('send-continue Maximum number of retries reached, stop retries');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('AbortController Processing', () => {
    it('Should abort previous requests and create new ones AbortController', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const oldAbortController = new AbortController();
      const abortSpy = vi.spyOn(oldAbortController, 'abort');
      mockState.abortController = oldAbortController;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Validation of pre-suspended request
      expect(abortSpy).toHaveBeenCalled();

      // New validation settings AbortController
      expect(mockState.setAbortController).toHaveBeenCalledWith(expect.any(AbortController));
    });

    it('It should be handled. abort Throw out an abnormal situation.', async () => {
      const realChunk: MessageChunk = {
        id: 'chunk-1',
        role: 'assistant',
        type: 'text',
        content: 'Hello',
      };

      mockState.chunks = [realChunk];

      const oldAbortController = {
        abort: vi.fn(() => {
          throw new Error('Abort error');
        }),
      };
      mockState.abortController = oldAbortController;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSendContinue({
          sessionIdRef,
          storeApi: mockStoreApi,
          retryTimerRef,
          handleResponse: mockHandleResponse,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      // It's not supposed to be a problem.
      await act(async () => {
        await result.current.sendContinue(0);
      });

      // Validation continues to carry out the follow-up logic
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
