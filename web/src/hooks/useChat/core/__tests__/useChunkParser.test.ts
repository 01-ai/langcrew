import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChunkParser } from '../useChunkParser';
import type { MessageChunk, ClientToolCallChunk, EventErrorChunk } from '@/types';
import { FAKE_CHUNK_PREFIX, FAKE_USER_MESSAGE_PREFIX } from '../../utils/constants';

// Mock dependencies
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

// Import after mocks
import { useRequestClient } from '@/store';
import { createRequestClient } from '@/services/requestClient';
import { executeClientToolCall } from '@/sdk';
import eventBus from '@/utils/eventBus';

describe('useChunkParser', () => {
  let mockStoreApi: any;
  let currentMessageRef: any;
  let mockState: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create persistent mock functions
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

    // Create a mock storeApi
    mockStoreApi = {
      getState: vi.fn(() => mockState),
    };

    (useRequestClient as any).mockImplementation(() => createRequestClient(mockStoreApi));

    currentMessageRef = { current: 'test message' };
  });

  describe('basics', () => {
    it('parses a valid JSON chunk', async () => {
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

      // Assert chunk was added to pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(1);
      expect(result.current.pendingChunks.current[0]).toEqual(chunk);
    });

    it('ignores invalid JSON strings', async () => {
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

      // Assert pendingChunks is empty
      expect(result.current.pendingChunks.current).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('addPendingChunks batch-appends chunks to the store', async () => {
      const { result } = renderHook(() =>
        useChunkParser({
          storeApi: mockStoreApi,
          currentMessageRef,
        }),
      );

      const chunk1: MessageChunk = { id: '1', role: 'assistant', type: 'text', content: 'chunk1' };
      const chunk2: MessageChunk = { id: '2', role: 'assistant', type: 'text', content: 'chunk2' };

      // Add multiple chunks
      await act(async () => {
        await result.current.handleChunk(JSON.stringify(chunk1));
        await result.current.handleChunk(JSON.stringify(chunk2));
      });

      expect(result.current.pendingChunks.current).toHaveLength(2);

      // Batch append
      act(() => {
        result.current.addPendingChunks();
      });

      expect(mockState.addChunks).toHaveBeenCalledWith([chunk1, chunk2]);
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('addPendingChunks does not call the store when there are no pending chunks', () => {
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

  describe('user message handling', () => {
    it('filters fake user messages and sets senderLoading to false', async () => {
      const mockChunks = [
        { id: `${FAKE_USER_MESSAGE_PREFIX}123`, role: 'user', content: 'msg1' },
        { id: '2', role: 'assistant', content: 'reply' },
        { id: `${FAKE_USER_MESSAGE_PREFIX}456`, role: 'user', content: 'msg2' },
      ];

      // Set chunks
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

      // Assert fake user-message chunks were filtered
      expect(mockState.setChunks).toHaveBeenCalledWith([
        { id: '2', role: 'assistant', content: 'reply' },
        { id: '4', role: 'user', type: 'text', content: 'New user message' },
      ]);

      // Assert senderLoading is false
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);

      // User chunks are already handled in setChunks; not added to pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });
  });

  describe('archived-session error (code 4102)', () => {
    it('embedded mode: resets the store and resends the message', async () => {
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

      // Assert the store was reset
      expect(mockState.resetStore).toHaveBeenCalled();

      // Assert an event was sent
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_embedded', {
        content: 'test message',
      });

      // Assert chunk was not added to pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('page mode: adds an error message and marks the session archived', async () => {
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

      // Assert an error message was added
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          type: 'error',
          content: 'Session has been archived',
        }),
      );

      // Assert session status was set
      expect(mockState.setSessionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ARCHIVED',
        }),
      );

      // Assert chunk was not added to pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('uses the default error message when message is missing', async () => {
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

  describe('client tool-call handling', () => {
    it('prefers the instance handler and passes generic context', async () => {
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

    it('drops client tool calls that belong to a previous session', async () => {
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

    it('fires onToolResult with standard fields for any server tool_result', async () => {
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

    it('runs and sends only once for a duplicate call_id', async () => {
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

    it('discards stale results and pending state if the session changes before the handler returns', async () => {
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

    it('runs the client tool and sends a result when wait_for_result is true', async () => {
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

      // Assert the tool ran
      expect(executeClientToolCall).toHaveBeenCalledWith(toolCallChunk, expect.any(Object));

      // Assert a result event was sent
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-123',
          status: 'completed',
          output: { result: 'success' },
        },
      });

      // Assert chunk was not added to pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });

    it('sends failed status when the tool throws', async () => {
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

    it('does not send a result when wait_for_result is false', async () => {
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

      // Assert the tool ran
      expect(executeClientToolCall).toHaveBeenCalled();

      // Assert no result event was sent
      expect(eventBus.emit).not.toHaveBeenCalled();
      expect(mockState.setPendingClientToolResult).not.toHaveBeenCalled();

      // Assert chunk was not added to pendingChunks
      expect(result.current.pendingChunks.current).toHaveLength(0);
    });
  });

  describe('different instanceId handling', () => {
    it('sends the correct event for instanceId', async () => {
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

      // Assert the event name uses instanceId
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_embedded', expect.any(Object));
    });
  });

  describe('no offline notice when sending client_tool_result', () => {
    it('does not add an offline notice when sending client_tool_result', async () => {
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

      // Assert a result event was sent
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-123',
          status: 'completed',
          output: { result: 'success' },
        },
      });

      // Assert no offline/interrupted fake messages
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

    it('does not add an interrupted notice when sending client_tool_result', async () => {
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

      // Assert a result event was sent
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_embedded', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-456',
          status: 'failed',
          output: { error: 'failed' },
        },
      });

      // Assert no offline fake messages
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

    it('does not clear old fake messages when sending client_tool_result (expected abort)', async () => {
      const mockResult = { success: true, data: { result: 'success' } };
      (executeClientToolCall as any).mockResolvedValue(mockResult);

      // Seed old fake messages
      const oldFakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}retry-123456`,
        role: 'assistant',
        type: 'live_status',
        content: '旧的重连提示',
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

      // Assert a result event was sent
      expect(eventBus.emit).toHaveBeenCalledWith('call_send_page', {
        type: 'client_tool_result',
        params: {
          call_id: 'call-789',
          status: 'completed',
          output: { result: 'success' },
        },
      });

      // Assert setChunks is not used to clear fake messages (expected abort, not a network error)
      expect(mockState.setChunks).not.toHaveBeenCalled();

      // Assert no new offline notice
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
