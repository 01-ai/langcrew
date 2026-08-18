import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSEHandler } from '../useSSEHandler';
import { DEBOUNCE_TIME, RETRY_DELAY, FAKE_CHUNK_PREFIX } from '../../utils/constants';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/test', search: '', hash: '', state: null }),
}));

// Mock dependencies
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'chatbot.task.connection.interrupted': '连接中断，正在尝试恢复...',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@ant-design/x-sdk', () => ({
  XStream: vi.fn(),
}));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    isMessageFinish: vi.fn(),
  };
});

// Import after mocks
import { XStream } from '@ant-design/x-sdk';
import { isMessageFinish } from '../../utils';

describe('useSSEHandler', () => {
  let mockStoreApi: any;
  let mockState: any;
  let debounceTimerRef: any;
  let retryTimerRef: any;
  let mockHandleChunk: any;
  let mockAddPendingChunks: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create persistent mock functions
    mockState = {
      chunks: [],
      pipelineMessages: [],
      pendingClientToolResult: false,
      addChunk: vi.fn(),
      setChunks: vi.fn(),
    };

    // Create a mock storeApi
    mockStoreApi = {
      getState: vi.fn(() => mockState),
    };

    debounceTimerRef = { current: 0 };
    retryTimerRef = { current: null };
    mockHandleChunk = vi.fn();
    mockAddPendingChunks = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basics', () => {
    it('handles an SSE stream successfully', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }, { data: '{"id":"2","content":"chunk2"}' }];

      // Mock XStream returning an async iterator
      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert handleChunk was called
      expect(mockHandleChunk).toHaveBeenCalledTimes(2);
      expect(mockHandleChunk).toHaveBeenNthCalledWith(1, '{"id":"1","content":"chunk1"}');
      expect(mockHandleChunk).toHaveBeenNthCalledWith(2, '{"id":"2","content":"chunk2"}');

      // Assert addPendingChunks ran in finally
      expect(mockAddPendingChunks).toHaveBeenCalled();

      // Assert onComplete was called
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('starts the batch timer', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const setIntervalSpy = vi.spyOn(window, 'setInterval');

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.handleResponse(mockResponse, vi.fn(), vi.fn());
      });

      // Assert the timer started
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), DEBOUNCE_TIME);

      // Timer is cleared after the stream; assert it was set during processing
      // finally clears the timer; assert it was set via setInterval

      setIntervalSpy.mockRestore();
    });

    it('does not start a second timer if one already exists', async () => {
      debounceTimerRef.current = 123 as any; // existing timer

      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const setIntervalSpy = vi.spyOn(window, 'setInterval');

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.handleResponse(mockResponse, vi.fn(), vi.fn());
      });

      // Assert no new timer was created
      expect(setIntervalSpy).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });

    it('clears the timer after the stream finishes', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      // Seed a timer id
      debounceTimerRef.current = 123 as any;

      await act(async () => {
        await result.current.handleResponse(mockResponse, vi.fn(), vi.fn());
      });

      // Assert the timer was cleaned up
      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      expect(debounceTimerRef.current).toBe(0);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('AbortError handling', () => {
    it('handles AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      // Mock XStream throwing AbortError
      const mockStream = async function* () {
        yield { data: '{"id":"1","content":"chunk1"}' };
        throw abortError;
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert a log was written
      expect(consoleLogSpy).toHaveBeenCalledWith('SSE stream was aborted in handleResponse');

      // Assert onComplete ran (not onTimeout)
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockOnTimeout).not.toHaveBeenCalled();

      // Assert no interrupt notice
      expect(mockState.addChunk).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('handles other error types', async () => {
      const otherError = new Error('Network error');

      // Mock XStream throwing another error
      // Mock XStream throwing another error
      // eslint-disable-next-line require-yield
      const mockStream = async function* () {
        throw otherError;
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      // Should throw
      await expect(
        act(async () => {
          await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
        }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('unfinished session detection and retry', () => {
    it('retries when the session is unfinished', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      // Unfinished session with old fake messages
      const realChunk = { id: '1', role: 'assistant', type: 'text', content: 'Incomplete' };
      const oldFakeChunk = {
        id: `${FAKE_CHUNK_PREFIX}retry-123456`,
        role: 'assistant',
        type: 'live_status',
        content: '旧的重连提示',
      };
      mockState.chunks = [realChunk, oldFakeChunk];
      mockState.pipelineMessages = [{ role: 'assistant', messages: [realChunk] }];

      (isMessageFinish as any).mockReturnValue(false); // unfinished

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert a log was written
      expect(consoleLogSpy).toHaveBeenCalledWith('SSE stream ended but session not finished');
      expect(consoleLogSpy).toHaveBeenCalledWith('scheduling retry with send-continue');

      // Assert old fake messages were cleared (real ones kept)
      expect(mockState.setChunks).toHaveBeenCalled();
      const setChunksCall = mockState.setChunks.mock.calls[0][0];
      // setChunks now receives filterFakeChunks output (array)
      expect(setChunksCall).toEqual([realChunk]); // keep real messages only

      // Assert an interrupt notice was added
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}interrupted-`),
          role: 'assistant',
          type: 'live_status',
          content: '连接中断，正在尝试恢复...',
        }),
      );

      // Assert a retry timer was set
      expect(retryTimerRef.current).not.toBeNull();

      // Assert onComplete ran first
      expect(mockOnComplete).toHaveBeenCalled();

      // Advance time to trigger retry
      act(() => {
        vi.advanceTimersByTime(RETRY_DELAY);
      });

      // Assert onTimeout was called
      expect(mockOnTimeout).toHaveBeenCalled();

      // Assert the timer was cleared
      expect(retryTimerRef.current).toBeNull();

      consoleLogSpy.mockRestore();
    });

    it('does not retry while waiting for client_tool_result', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const realChunk = { id: '1', role: 'assistant', type: 'text', content: 'Waiting for client tool' };
      mockState.chunks = [realChunk];
      mockState.pipelineMessages = [{ role: 'assistant', messages: [realChunk] }];
      mockState.pendingClientToolResult = true;

      (isMessageFinish as any).mockReturnValue(false);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('SSE stream ended while waiting for client tool result');
      expect(mockState.setChunks).not.toHaveBeenCalled();
      expect(mockState.addChunk).not.toHaveBeenCalled();
      expect(retryTimerRef.current).toBeNull();
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockOnTimeout).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('does not retry when the session is finished', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      // Session already finished
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Complete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'finish_reason', content: 'Complete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(true); // finished

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert no interrupt notice
      expect(mockState.addChunk).not.toHaveBeenCalled();

      // Assert no retry timer
      expect(retryTimerRef.current).toBeNull();

      // Assert only onComplete was called
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('does not retry when there are no chunks', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      // Empty chunks
      mockState.chunks = [];
      mockState.pipelineMessages = [];

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert no interrupt notice
      expect(mockState.addChunk).not.toHaveBeenCalled();

      // Assert no retry timer
      expect(retryTimerRef.current).toBeNull();
    });

    it('does not retry when the last message is not assistant', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      // Last message is user
      mockState.chunks = [{ id: '1', role: 'user', type: 'text', content: 'User message' }];
      mockState.pipelineMessages = [
        { role: 'user', messages: [{ id: '1', role: 'user', type: 'text', content: 'User message' }] },
      ];

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert no interrupt notice
      expect(mockState.addChunk).not.toHaveBeenCalled();

      // Assert no retry timer
      expect(retryTimerRef.current).toBeNull();
    });

    it('clears a previous retry timer', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      // Session not finished
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);

      // Seed an existing retry timer
      retryTimerRef.current = 123 as any;

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.handleResponse(mockResponse, vi.fn(), vi.fn());
      });

      // Assert the previous timer was cleared
      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('batch timer', () => {
    it('timer periodically calls addPendingChunks', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.handleResponse(mockResponse, vi.fn(), vi.fn());
      });

      // Advance time to fire the timer
      act(() => {
        vi.advanceTimersByTime(DEBOUNCE_TIME);
      });

      // Assert addPendingChunks was called
      expect(mockAddPendingChunks).toHaveBeenCalled();

      // Assert the timer was cleared
      expect(debounceTimerRef.current).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles an empty SSE stream', async () => {
      const mockStream = async function* () {
        // Empty stream, yield nothing
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, vi.fn(), mockOnComplete);
      });

      // Assert handleChunk was not called
      expect(mockHandleChunk).not.toHaveBeenCalled();

      // Assert addPendingChunks was called
      expect(mockAddPendingChunks).toHaveBeenCalled();

      // Assert onComplete was called
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('handles empty pipelineMessages', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      // Empty pipelineMessages
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Test' }];
      mockState.pipelineMessages = [];

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert no retry (lastMessage is undefined)
      expect(mockState.addChunk).not.toHaveBeenCalled();
      expect(retryTimerRef.current).toBeNull();
    });

    it('handles lastMessage being undefined', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }];

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      };

      (XStream as any).mockReturnValue(mockStream());

      const mockResponse = {
        body: new ReadableStream(),
      };

      // pipelineMessages whose last item is undefined
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Test' }];
      mockState.pipelineMessages = [undefined];

      const { result } = renderHook(() =>
        useSSEHandler({
          storeApi: mockStoreApi,
          debounceTimerRef,
          retryTimerRef,
          handleChunk: mockHandleChunk,
          addPendingChunks: mockAddPendingChunks,
          enableSendContinue: true,
        }),
      );

      const mockOnTimeout = vi.fn();
      const mockOnComplete = vi.fn();

      await act(async () => {
        await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
      });

      // Assert no retry (lastMessage is undefined)
      expect(mockState.addChunk).not.toHaveBeenCalled();
      expect(retryTimerRef.current).toBeNull();
    });
  });
});
