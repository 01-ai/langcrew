import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChunkParser } from '../useChunkParser';
import type { MessageChunk, ClientToolCallChunk, EventErrorChunk } from '@/types';
import { FAKE_CHUNK_PREFIX, FAKE_USER_MESSAGE_PREFIX } from '../../utils/constants';

// Mock Dependency
vi.mock('@/sdk', () => ({
  executeClientToolCall: vi.fn(),
}));

vi.mock('@/utils/json', () => ({
  isJsonString: vi.fn((str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }),
}));

vi.mock('@/utils/eventBus', () => ({
  default: {
    emit: vi.fn(),
  },
}));

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

// Import mock Post Module
import { useRequestClient } from '@/store';
import { createRequestClient } from '@/services/requestClient';
import { executeClientToolCall } from '@/sdk';
import eventBus from '@/utils/eventBus';

describe('useChunkParser', () => {
  let mockStoreApi: any;
  let currentMessageRef: any;
  let mockState: any;

  beforeEach(() => {
    // Reset All mock
    vi.clearAllMocks();

    // Create Lasting mock Functions
    mockState = {
      agentId: 'test-agent',
      sessionId: 'session-123',
      instanceId: 'page',
      requestConfig: {
        extraHeaders: {},
      },
      sessionConfig: { autoRetryOnArchive: false, enableRouting: true, enableSessionLoading: true },
      chunks: [],
      addChunks: vi.fn(),
      setChunks: vi.fn(),
      setSenderLoading: vi.fn(),
      addChunk: vi.fn(),
      resetStore: vi.fn(),
      setSessionInfo: vi.fn(),
      setPendingClientToolResult: vi.fn(),
      onSessionInfoChange: vi.fn(),
      clientToolHandlers: {},
      onToolResult: undefined,
      abortController: null,
      sessionInfo: { status: 'ACTIVE' },
    };

    // Create mock storeApi
    mockStoreApi = {
      getState: vi.fn(() => mockState),
    };

    (useRequestClient as any).mockImplementation(() => createRequestClient(mockStoreApi));

    currentMessageRef = { current: 'test message' };
  });

  describe('Basic functions', () => {
    it('It should be correct to interpret the work. JSON chunk', async () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const chunk: MessageChunk = {
        id: '1',
        role: 'assistant',
        type: 'text',
        content: 'Hello, world!',
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(chunk));
      });

      // Verify chunk Added to pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(1);
      expect(result.current.pendingChunks.current[0]).toEqual(chunk);
    });

    it('It\'s not working. JSON String', async () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await result.current.handleChunk('invalid json');
      });

      // Verify pendingChunks Empty
      expect(result.current.pendingChunks.current).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('addPendingChunks Should be added in bulk chunks Present. store', async () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const chunk1: MessageChunk = { id: '1', role: 'assistant', type: 'text', content: 'chunk1' };
      const chunk2: MessageChunk = { id: '2', role: 'assistant', type: 'text', content: 'chunk2' };

      // Add More chunks
      await act(async () => {
        await result.current.handleChunk(JSON.stringify(chunk1));
        await result.current.handleChunk(JSON.stringify(chunk2));
      });

      expect(result.current.pendingChunks.current).toHaveLength(2);

      // Batch Add
      act(() => {
        result.current.addPendingChunks();
      });

      expect(mockState.addChunks).toHaveBeenCalledWith([chunk1, chunk2]);
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('addPendingChunks No, we\'re not. chunks It\'s not supposed to be called. store', () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      act(() => {
        result.current.addPendingChunks();
      });

      expect(mockState.addChunks).not.toHaveBeenCalled();
    });

  });

  describe('user Message Processing', () => {
    it('It should be filtered out. fake user message and set up senderLoading Yes false', async () => {
      const mockChunks = [
        { id: `${FAKE_USER_MESSAGE_PREFIX}123`, role: 'user', content: 'msg1' },
        { id: '2', role: 'assistant', content: 'reply' },
        { id: `${FAKE_USER_MESSAGE_PREFIX}456`, role: 'user', content: 'msg2' },
      ];

      // Settings chunks
      mockState.chunks = mockChunks;

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const userChunk: MessageChunk = {
        id: '4',
        role: 'user',
        type: 'text',
        content: 'New user message',
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(userChunk));
      });

      // The filter is off. fake user message chunks
      expect(mockState.setChunks).toHaveBeenCalledWith([
        { id: '2', role: 'assistant', content: 'reply' },
        { id: '4', role: 'user', type: 'text', content: 'New user message' },
      ]);

      // Verify Settings senderLoading Yes false
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);

      // Note:user chunk Yes. setChunks , which is processed, will not be added pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });
  });

  describe('Session Archive Error Processing (Performance)code 4102）', () => {
    it('Embedded mode: Should be reset store & Send Back Messages', async () => {
      mockState.instanceId = 'embedded';
      mockState.sessionConfig = { autoRetryOnArchive: true, enableRouting: false, enableSessionLoading: false };
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const errorChunk: EventErrorChunk & MessageChunk = {
        id: '1',
        role: 'assistant',
        type: 'error',
        content: '',
        code: 4102,
        message: 'Session archived',
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(errorChunk));
      });

      // Authenticate Reset store
      expect(mockState.resetStore).toHaveBeenCalled();

      // Verify Sending Event
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_embedded', {
        content: 'test message',
      });

      // Verify chunk Not added pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('Page Mode: Error message should be added and session status set for archive', async () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const errorChunk: EventErrorChunk & MessageChunk = {
        id: '1',
        role: 'assistant',
        type: 'error',
        content: '',
        code: 4102,
        message: 'Session has been archived',
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(errorChunk));
      });

      // Verify the expected behavior.
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          type: 'error',
          content: 'Session has been archived',
        }),
      );

      // Verify Session Status
      expect(mockState.setSessionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ARCHIVED',
        }),
      );

      // Verify chunk Not added pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('Default error message should be used message When does not exist', async () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const errorChunk: EventErrorChunk & MessageChunk = {
        id: '1',
        role: 'assistant',
        type: 'error',
        content: '',
        code: 4102,
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(errorChunk));
      });

      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Session is archived',
        }),
      );
    });
  });

  describe('Client Tool Call Processing', () => {
    it('Examples of implementation that should be prioritized handler，And pass on the common context.', async () => {
      const instanceHandler = vi.fn().mockResolvedValue({ source: 'instance' });
      mockState.clientToolHandlers = { test_tool: instanceHandler };
      mockState.abortController = new AbortController();
      (executeClientToolCall as any).mockResolvedValue({ success: true, data: { source: 'instance' } });

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: 'tool-1',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        session_id: 'session-123',
        detail: {
          call_id: 'call-1',
          name: 'test_tool',
          arguments: { value: 1 },
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      expect(executeClientToolCall).toHaveBeenCalledWith(
        toolCallChunk,
        expect.objectContaining({
          handler: instanceHandler,
          agentId: 'test-agent',
          sessionId: 'session-123',
          signal: mockState.abortController.signal,
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-1',
          status: 'completed',
          output: { source: 'instance' },
        },
      });
    });

    it('It\'s time to abandon the old. session Client tool call', async () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );
      const toolCallChunk: ClientToolCallChunk = {
        id: 'stale-session-tool',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        session_id: 'session-old',
        detail: {
          call_id: 'stale-session-call',
          name: 'test_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      expect(executeClientToolCall).not.toHaveBeenCalled();
      expect(mockState.setPendingClientToolResult).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('Received Any Service tool_result from the time triggers with standard fields onToolResult', async () => {
      mockState.onToolResult = vi.fn();
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );
      const toolResultChunk: MessageChunk = {
        id: 'result-1',
        role: 'assistant',
        type: 'tool_result',
        content: '',
        session_id: 'chunk-session',
        detail: {
          result: {
            name: 'nested_tool',
            status: 'completed',
            result: { value: 42 },
          },
        },
      } as any;

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolResultChunk));
      });

      expect(mockState.onToolResult).toHaveBeenCalledWith({
        toolName: 'nested_tool',
        chunk: toolResultChunk,
        sessionId: 'chunk-session',
        status: 'completed',
        result: { value: 42 },
      });
      expect(result.current.pendingChunks.current).toEqual([toolResultChunk]);
    });

    it('Same. call_id Only execute and send once when arriving repeatedly', async () => {
      (executeClientToolCall as any).mockResolvedValue({ success: true, data: {} });
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: 'tool-2',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'duplicate-call',
          name: 'test_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      expect(executeClientToolCall).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
    });

    it('handler Switch Before Return session Discarding old results and cleaning pending Status', async () => {
      let resolveTool!: (value: { success: boolean; data: Record<string, unknown> }) => void;
      (executeClientToolCall as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveTool = resolve;
          }),
      );
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );
      const toolCallChunk: ClientToolCallChunk = {
        id: 'stale-tool',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        session_id: 'session-123',
        detail: {
          call_id: 'stale-call',
          name: 'slow_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: true,
        },
      };

      let handling!: Promise<void>;
      await act(async () => {
        handling = result.current.handleChunk(JSON.stringify(toolCallChunk));
        await Promise.resolve();
      });
      mockState.sessionId = 'session-456';
      await act(async () => {
        resolveTool({ success: true, data: { stale: true } });
        await handling;
      });

      expect(eventBus.emit).not.toHaveBeenCalled();
      expect(mockState.setPendingClientToolResult).toHaveBeenNthCalledWith(1, true);
      expect(mockState.setPendingClientToolResult).toHaveBeenLastCalledWith(false);
    });

    it('Client tool should be executed and wait_for_result Yes true Send results when', async () => {
      const mockResult = { success: true, data: { result: 'success' } };
      (executeClientToolCall as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: '1',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'call-123',
          name: 'test_tool',
          arguments: { param: 'value' },
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      expect(mockState.setPendingClientToolResult).toHaveBeenCalledWith(true);

      // Verify the tool callable
      expect(executeClientToolCall).toHaveBeenCalledWith(toolCallChunk, expect.any(Object));

      // Verify sending result event
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-123',
          status: 'completed',
          output: { result: 'success' },
        },
      });

      // Verify chunk Not added pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('Should be sent when tool execution fails failed Status', async () => {
      const mockResult = { success: false, data: { error: 'failed' } };
      (executeClientToolCall as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: '1',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'call-456',
          name: 'test_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-456',
          status: 'failed',
          output: { error: 'failed' },
        },
      });
    });

    it('I think so. wait_for_result Yes false Do not send results from time to time', async () => {
      const mockResult = { success: true, data: {} };
      (executeClientToolCall as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: '1',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'call-789',
          name: 'test_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: false,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      // Verify the tool callable
      expect(executeClientToolCall).toHaveBeenCalled();

      // Verify that no result was sent
      expect(eventBus.emit).not.toHaveBeenCalled();
      expect(mockState.setPendingClientToolResult).not.toHaveBeenCalled();

      // Verify chunk Not added pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });
  });

  describe('Different. instanceId Processing', () => {
    it('It should be based on instanceId Send the right event', async () => {
      mockState.instanceId = 'embedded';
      mockState.sessionConfig = { autoRetryOnArchive: false };
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: '1',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'call-123',
          name: 'test_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: true,
        },
      };

      (executeClientToolCall as any).mockResolvedValue({ success: true, data: {} });

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      // Validation Usage instanceId Event Name
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_embedded', expect.any(Object));
    });
  });

  describe('client_tool_result Do not add a network disconnect hint when sending', () => {
    it('Send client_tool_result should not add offline Hint', async () => {
      const mockResult = { success: true, data: { result: 'success' } };
      (executeClientToolCall as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: '1',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'call-123',
          name: 'test_tool',
          arguments: { param: 'value' },
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      // Verify sending result event
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-123',
          status: 'completed',
          output: { result: 'success' },
        },
      });

      // Validation should not add the false message that the network is disconnected from (offline or interrupted）
      const addChunkCalls = mockState.addChunk.mock.calls;
      const offlineOrInterruptedCalls = addChunkCalls.filter((call: any[]) => {
        const chunk = call[0];
        return (
          chunk &&
          chunk.id &&
          (chunk.id.includes(`${FAKE_CHUNK_PREFIX}offline`) || chunk.id.includes(`${FAKE_CHUNK_PREFIX}interrupted`))
        );
      });
      expect(offlineOrInterruptedCalls).toHaveLength(0);
    });

    it('Send client_tool_result should not add interrupted Hint', async () => {
      mockState.instanceId = 'embedded';
      const mockResult = { success: false, data: { error: 'failed' } };
      (executeClientToolCall as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: '2',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'call-456',
          name: 'test_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      // Verify sending result event
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_embedded', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-456',
          status: 'failed',
          output: { error: 'failed' },
        },
      });

      // Verify should not add false messages about network disconnection
      const addChunkCalls = mockState.addChunk.mock.calls;
      const networkErrorCalls = addChunkCalls.filter((call: any[]) => {
        const chunk = call[0];
        return (
          chunk &&
          chunk.id &&
          (chunk.id.includes(`${FAKE_CHUNK_PREFIX}offline`) ||
            chunk.id.includes(`${FAKE_CHUNK_PREFIX}interrupted`) ||
            chunk.id.includes(`${FAKE_CHUNK_PREFIX}retry`))
        );
      });
      expect(networkErrorCalls).toHaveLength(0);
    });

    it('Send client_tool_result It\'s not time to clean up old false messages.', async () => {
      const mockResult = { success: true, data: { result: 'success' } };
      (executeClientToolCall as any).mockResolvedValue(mockResult);

      // Set up some old false messages
      const oldFakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}retry-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Reconnecting Tip',
      };
      mockState.chunks = [oldFakeChunk];

      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const toolCallChunk: ClientToolCallChunk = {
        id: '3',
        role: 'assistant',
        type: 'client_tool_call',
        content: '',
        detail: {
          call_id: 'call-789',
          name: 'test_tool',
          arguments: {},
          status: 'pending',
          wait_for_result: true,
        },
      };

      await act(async () => {
        await result.current.handleChunk(JSON.stringify(toolCallChunk));
      });

      // Verify sending result event
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-789',
          status: 'completed',
          output: { result: 'success' },
        },
      });

      // Verify should not be called setChunks To clear old false messages.
      expect(mockState.setChunks).not.toHaveBeenCalled();

      // Verify should not add a new network disconnect hint
      const addChunkCalls = mockState.addChunk.mock.calls;
      const networkErrorCalls = addChunkCalls.filter((call: any[]) => {
        const chunk = call[0];
        return (
          chunk &&
          chunk.id &&
          (chunk.id.includes(`${FAKE_CHUNK_PREFIX}offline`) || chunk.id.includes(`${FAKE_CHUNK_PREFIX}interrupted`))
        );
      });
      expect(networkErrorCalls).toHaveLength(0);
    });
  });
});
