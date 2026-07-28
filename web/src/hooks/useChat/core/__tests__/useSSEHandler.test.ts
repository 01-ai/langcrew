import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSEHandler } from '../useSSEHandler';
import { DEBOUNCE_TIME, RETRY_DELAY, FAKE_CHUNK_PREFIX } from '../../utils/constants';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/test', search: '', hash: '', state: null }),
}));

// Mock Dependency
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'chatbot.task.connection.interrupted': 'Connection is down, trying to restore...',
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

// Import mock Post Module
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
    // Reset All mock
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create Lasting mock Functions
    mockState = {
      chunks: [],
      pipelineMessages: [],
      pendingClientToolResult: false,
      addChunk: vi.fn(),
      setChunks: vi.fn(),
    };

    // Create mock storeApi
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

  describe('Basic functions', () => {
    it('It should be handled successfully. SSE Stream', async () => {
      const mockChunks = [{ data: '{"id":"1","content":"chunk1"}' }, { data: '{"id":"2","content":"chunk2"}' }];

      // Mock XStream Returning the heterogeneity
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

      // Verify Call handleChunk
      expect(mockHandleChunk).toHaveBeenCalledTimes(2);
      expect(mockHandleChunk).toHaveBeenNthCalledWith(1, '{"id":"1","content":"chunk1"}');
      expect(mockHandleChunk).toHaveBeenNthCalledWith(2, '{"id":"2","content":"chunk2"}');

      // Verify Call addPendingChunks（Yes. finally Medium)
      expect(mockAddPendingChunks).toHaveBeenCalled();

      // Verify Call onComplete
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('Batch processing timer should be activated', async () => {
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

      // Verify timer activated
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), DEBOUNCE_TIME);

      // Note: The timer is cleaned up when the flow is finished, so the timer is set here as the flow is processed.
      // Because finally Blocks clean the timer, so here it is verified that the timer was set (through setInterval Call)

      setIntervalSpy.mockRestore();
    });

    it('If the timer already exists, it should not be repeated.', async () => {
      debounceTimerRef.current = 123 as any; // Timer already in place

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

      // Verify does not create a new timer
      expect(setIntervalSpy).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });

    it('The timer should be cleaned after the flow is finished.', async () => {
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

      // Set a timer first ID
      debounceTimerRef.current = 123 as any;

      await act(async () => {
        await result.current.handleResponse(mockResponse, vi.fn(), vi.fn());
      });

      // Validation cleared the timer
      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      expect(debounceTimerRef.current).toBe(0);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('AbortError Processing', () => {
    it('It should be handled right. AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      // Mock XStream Throw AbortError
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

      // Check logs
      expect(consoleLogSpy).toHaveBeenCalledWith('SSE stream was aborted in handleResponse');

      // Verify Call onComplete（Not onTimeout）
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockOnTimeout).not.toHaveBeenCalled();

      // Verify does not add a break hint
      expect(mockState.addChunk).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('Other types of errors should be dealt with.', async () => {
      const otherError = new Error('Network error');

      // Mock XStream Throw other errors
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

      // You should throw the mistake.
      await expect(
        act(async () => {
          await result.current.handleResponse(mockResponse, mockOnTimeout, mockOnComplete);
        }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('Sessions not tested and retrying', () => {
    it('If the session is not completed, the retry should be triggered', async () => {
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

      // Sets the status of the incomplete session, including old false messages
      const realChunk = { id: '1', role: 'assistant', type: 'text', content: 'Incomplete' };
      const oldFakeChunk = {
        id: `${FAKE_CHUNK_PREFIX}retry-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Reconnecting Tip',
      };
      mockState.chunks = [realChunk, oldFakeChunk];
      mockState.pipelineMessages = [{ role: 'assistant', messages: [realChunk] }];

      (isMessageFinish as any).mockReturnValue(false); // Not completed

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

      // Check logs
      expect(consoleLogSpy).toHaveBeenCalledWith('SSE stream ended but session not finished');
      expect(consoleLogSpy).toHaveBeenCalledWith('scheduling retry with send-continue');

      // Verify to clear old false messages first (retain the real message)
      expect(mockState.setChunks).toHaveBeenCalled();
      const setChunksCall = mockState.setChunks.mock.calls[0][0];
      // setChunks Now, here's the one that's receiving. filterFakeChunks Results (array)
      expect(setChunksCall).toEqual([realChunk]); // Keep only the real message

      // Check added a break hint
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}interrupted-`),
          role: 'assistant',
          type: 'live_status',
          content: 'Connection is down, trying to restore...',
        }),
      );

      // Validation settings for retry timers
      expect(retryTimerRef.current).not.toBeNull();

      // Validation first. onComplete
      expect(mockOnComplete).toHaveBeenCalled();

      // Push time, trigger retry
      act(() => {
        vi.advanceTimersByTime(RETRY_DELAY);
      });

      // Verify Call onTimeout
      expect(mockOnTimeout).toHaveBeenCalled();

      // Verify timer cleared
      expect(retryTimerRef.current).toBeNull();

      consoleLogSpy.mockRestore();
    });

    it('Wait client_tool_result Time should not trigger a re-test.', async () => {
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

    it('If the session is completed, no retry should be triggered', async () => {
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

      // Sets the completed session status
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Complete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'finish_reason', content: 'Complete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(true); // Completed

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

      // Verify does not add a break hint
      expect(mockState.addChunk).not.toHaveBeenCalled();

      // Validate no retry timer set
      expect(retryTimerRef.current).toBeNull();

      // Verify only called onComplete
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('If not chunks，It\'s not supposed to trigger a re-test.', async () => {
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

      // Set empty chunks
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

      // Verify does not add a break hint
      expect(mockState.addChunk).not.toHaveBeenCalled();

      // Validate no retry timer set
      expect(retryTimerRef.current).toBeNull();
    });

    it('If the last message isn\'t... assistant，It\'s not supposed to trigger a re-test.', async () => {
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

      // Set the last message to be user
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

      // Verify does not add a break hint
      expect(mockState.addChunk).not.toHaveBeenCalled();

      // Validate no retry timer set
      expect(retryTimerRef.current).toBeNull();
    });

    it('Should clear previous retry timers', async () => {
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

      // Sets the status of incomplete sessions
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);

      // Set an existing retry timer
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

      // Verify clears the previous timer
      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Batch Process Timer', () => {
    it('Timer should be called on a regular basis addPendingChunks', async () => {
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

      // Push time, trigger timer.
      act(() => {
        vi.advanceTimersByTime(DEBOUNCE_TIME);
      });

      // Verify Call addPendingChunks
      expect(mockAddPendingChunks).toHaveBeenCalled();

      // Verify timer cleared
      expect(debounceTimerRef.current).toBe(0);
    });
  });

  describe('Border situation', () => {
    it('It should be empty. SSE Stream', async () => {
      const mockStream = async function* () {
        // An empty stream that yields no data.
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

      // Verify not called handleChunk
      expect(mockHandleChunk).not.toHaveBeenCalled();

      // Verify Call addPendingChunks
      expect(mockAddPendingChunks).toHaveBeenCalled();

      // Verify Call onComplete
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('It should be handled. pipelineMessages Empty', async () => {
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

      // Set empty pipelineMessages
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

      // Validation does not trigger a re-test (because) lastMessage Yes. undefined）
      expect(mockState.addChunk).not.toHaveBeenCalled();
      expect(retryTimerRef.current).toBeNull();
    });

    it('It should be handled. lastMessage Yes undefined Situation', async () => {
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

      // Settings pipelineMessages But the last message is... undefined
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

      // Validation does not trigger a re-test (because) lastMessage Yes. undefined）
      expect(mockState.addChunk).not.toHaveBeenCalled();
      expect(retryTimerRef.current).toBeNull();
    });
  });
});
