import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSend } from '../useSend';
import type { SendOptions } from '../../index';
import type { MessageChunk } from '@/types';
import { FAKE_CHUNK_PREFIX, RETRY_DELAY } from '../../utils/constants';

// Mock Dependency
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/test', search: '', hash: '', state: null }),
}));

const { mockAxiosPost, mockAxiosGet } = vi.hoisted(() => ({
  mockAxiosPost: vi.fn(),
  mockAxiosGet: vi.fn(),
}));

vi.mock('@/services/request', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/request')>();
  const axios = {
    post: mockAxiosPost,
    get: mockAxiosGet,
  };
  return {
    ...actual,
    axios,
    default: axios,
    getCsrfToken: vi.fn(() => 'mock-csrf-token'),
    getCommonRequestHeaders: vi.fn((additionalHeaders?: Record<string, string>) => ({
      'csrf-token': 'mock-csrf-token',
      language: 'zh',
      'accept-language': 'zh',
      ...additionalHeaders,
    })),
  };
});

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'chatbot.task.network.offline': 'The network is disconnected. Check the network connection. The network will continue automatically when restored...',
        'chatbot.task.server.reconnecting': `Server connection is down, reconnecting.... (${params?.current || 0}/${params?.max || 0})`,
      };
      return translations[key] || key;
    },
  }),
  getLanguage: vi.fn(() => 'zh'),
}));


vi.mock('@/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store')>();
  return {
    ...actual,
    useAgentStore: vi.fn(),
    useRequestClient: vi.fn(),
  };
});

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    findInterruptDataChunk: vi.fn(),
  };
});

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Import mock Post Module
import { findInterruptDataChunk } from '../../utils';
import { useAgentStore, useRequestClient } from '@/store';
import { createRequestClient } from '@/services/requestClient';

describe('useSend', () => {
  let mockStoreApi: any;
  let mockState: any;
  let sessionIdRef: any;
  let basePathRef: any;
  let agentIdRef: any;
  let currentMessageRef: any;
  let retryTimerRef: any;
  let mockHandleResponse: any;
  let mockSendContinue: any;
  let mockOnSendComplete: any;

  beforeEach(() => {
    // Reset All mock
    vi.clearAllMocks();
    vi.useFakeTimers();

    (useAgentStore as any).mockReturnValue({
      sessionMode: '',
      chatEndpoint: undefined,
      sessionInfo: {},
      requestConfig: {
        extraHeaders: {},
      },
      showSenderActions: true,
    });

    // Create Lasting mock Functions
    mockState = {
      chunks: [],
      senderSending: false,
      senderLoading: false,
      pipelineMessages: [],
      selectedSenderModels: [],
      requestConfig: {
        extraHeaders: {},
      },
      sessionConfig: { enableRouting: true, enableSessionLoading: true, autoRetryOnArchive: false },
      addChunk: vi.fn(),
      setChunks: vi.fn(),
      setSenderLoading: vi.fn(),
      setSenderSending: vi.fn(),
      setAbortController: vi.fn(),
      setPendingClientToolResult: vi.fn(),
      setSessionInfo: vi.fn(),
      setSessionId: vi.fn(),
      setEmbeddedSessionId: vi.fn(),
      setIsNavigating: vi.fn(),
      setPreviousSessionId: vi.fn(),
      abortController: null,
    };

    // Create mock storeApi
    mockStoreApi = {
      getState: vi.fn(() => mockState),
    };

    (useRequestClient as any).mockImplementation(() => createRequestClient(mockStoreApi));

    sessionIdRef = { current: '' };
    basePathRef = { current: '/chat' };
    agentIdRef = { current: '01' };
    currentMessageRef = { current: '' };
    retryTimerRef = { current: null };
    mockHandleResponse = vi.fn();
    mockSendContinue = vi.fn();
    mockOnSendComplete = vi.fn();

    (useAgentStore as any).mockReturnValue({
      sessionMode: '',
      chatEndpoint: undefined,
      sessionInfo: {},
      requestConfig: {
        extraHeaders: {},
      },
      showSenderActions: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic functions - Send Message', () => {
    it('Should successfully send messages to existing sessions', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      const sendOptions: SendOptions = {
        content: 'Hello, world!',
        files: [],
      };

      await act(async () => {
        await result.current.send(sendOptions);
      });

      // Verify fetch Call
      expect(global.fetch).toHaveBeenCalledWith(
        '/app/api/v1/sessions/session-123/send',
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
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'Hello, world!',
            files: [],
            mock: false,
            general_agent_mode: 'Default',
          }),
          signal: expect.any(AbortSignal),
        }),
      );

      // Verify the expected behavior.
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          type: 'text',
          content: 'Hello, world!',
        }),
      );

      // Authenticate storage of current message
      expect(currentMessageRef.current).toBe('Hello, world!');

      // Verify Call handleResponse
      expect(mockHandleResponse).toHaveBeenCalledWith(mockResponse, expect.any(Function), mockOnSendComplete);
    });

    it('Should process attachments to documents', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      const sendOptions: SendOptions = {
        content: 'Check this file',
        files: [
          {
            name: 'test.pdf',
            key: 'file-key-123',
            url: 'https://example.com/file.pdf',
            size: 1024,
            type: 'application/pdf',
          },
        ],
      };

      await act(async () => {
        await result.current.send(sendOptions);
      });

      // Verify file correctly added to the requester
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'Check this file',
            files: [
              {
                name: 'test.pdf',
                key: 'file-key-123',
                url: 'https://example.com/file.pdf',
                size: 1024,
                type: 'application/pdf',
              },
            ],
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );

      // Verify file added to chunk its detail.attachments
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            attachments: [
              expect.objectContaining({
                filename: 'test.pdf',
                path: 'file-key-123',
                url: 'https://example.com/file.pdf',
                size: 1024,
                content_type: 'application/pdf',
                show_user: 1,
              }),
            ],
          }),
        }),
      );
    });

    it('Should be. metadata Send as top field and write to users chunk', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };
      const metadata = {
        reference: {
          type: 'todo',
          id: 'todo-001',
          title: 'Confirm to clients the availability of dissensitized samples',
          subtitle: 'Solution design and validation · Key progress',
          payload: {
            status: 'pending',
          },
        },
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'I don\'t think so.',
          files: [],
          metadata,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'I don\'t think so.',
            files: [],
            metadata,
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );

      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          type: 'text',
          content: 'I don\'t think so.',
          metadata,
          detail: expect.not.objectContaining({
            metadata,
          }),
        }),
      );
    });

    it('The selected model should be used', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;
      mockState.selectedSenderModels = [
        {
          id: 'model-123',
          model_display_name: 'GPT-4',
        },
      ];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'Hello',
            files: [],
            mock: false,
            model: {
              id: 'model-123',
              model_display_name: 'GPT-4',
            },
            general_agent_mode: 'Default',
          }),
        }),
      );
    });

    it('It should be merged. store and in the options', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;
      mockState.deepResearchOptions = {
        deepresearch: {
          mode: 'google_api',
        },
      };

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'Hello with options',
          options: { channel: 'option-1' },
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'Hello with options',
            files: [],
            mock: false,
            general_agent_mode: 'Default',
            options: {
              deepresearch: {
                mode: 'google_api',
              },
              channel: 'option-1',
            },
          }),
        }),
      );
    });
  });

  describe('Session Create', () => {
    it('I think so. sessionId Creates a new session for empty time (page mode)', async () => {
      sessionIdRef.current = '';
      mockState.senderSending = false;

      const mockSession = {
        session_id: 'new-session-123',
        title: 'New Session',
        status: 'ACTIVE',
      };

      (mockAxiosPost as any).mockResolvedValue({ data: { data: mockSession, code: 200 } });

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'Hello',
          knowledgeBases: [{ knowledge_id: 'kb-1' }],
          mcpTools: [{ agent_tool_id: 'tool-1', type: 'MCP' }],
          models: [{ id: 'model-1', model_display_name: 'Model 1' }],
        });
      });

      // Verify created session
      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/app/api/v1/sessions/',
        {
          content: 'Hello',
          knowledge_query_request: {
            knowledge_ids: ['kb-1'],
          },
          agent_tool_info: {
            agent_tool_items: [{ agent_tool_id: 'tool-1', agent_tool_type: 'MCP' }],
          },
          super_employee_id: '',
          mode: '',
          model: {
            id: 'model-1',
            model_display_name: 'Model 1',
          },
        },
        {},
      );

      // Verify set session information
      expect(mockState.setSessionInfo).toHaveBeenCalledWith(mockSession);
      expect(mockState.setChunks).toHaveBeenCalledWith([]);

      // Check for update. sessionIdRef
      expect(sessionIdRef.current).toBe('new-session-123');

      // Verify navigation to new route
      expect(mockNavigate).toHaveBeenCalledWith('/chat/01/new-session-123');

      // Validation has set up navigational signs.
      expect(mockState.setIsNavigating).toHaveBeenCalledWith(true);
      expect(mockState.setPreviousSessionId).toHaveBeenCalledWith('new-session-123');
      expect(mockState.setSessionId).toHaveBeenCalledWith('new-session-123');
    });

    it('Should wait. onSessionCreated Send your first message after completion', async () => {
      sessionIdRef.current = '';
      mockState.senderSending = false;
      const events: string[] = [];

      const mockSession = {
        session_id: 'new-session-callback',
        title: 'New Session',
        status: 'ACTIVE',
      };

      (mockAxiosPost as any).mockResolvedValue({ data: { data: mockSession, code: 200 } });
      mockState.onSessionCreated = vi.fn(async () => {
        events.push('onSessionCreated:start');
        await Promise.resolve();
        events.push('onSessionCreated:end');
      });

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockImplementation(() => {
        events.push('fetch');
        return Promise.resolve(mockResponse);
      });
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      expect(mockState.onSessionCreated).toHaveBeenCalledWith(mockSession);
      expect(events).toEqual(['onSessionCreated:start', 'onSessionCreated:end', 'fetch']);
    });

    it('I think so. sessionId Creates a new session for empty time (non-routing mode)', async () => {
      sessionIdRef.current = '';
      mockState.senderSending = false;
      mockState.sessionConfig = { enableRouting: false, enableSessionLoading: true, autoRetryOnArchive: false };

      const mockSession = {
        session_id: 'new-session-456',
        title: 'New Session',
        status: 'ACTIVE',
      };

      (mockAxiosPost as any).mockResolvedValue({ data: { data: mockSession, code: 200 } });

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Verify created session
      expect(mockAxiosPost).toHaveBeenCalled();

      // Checking settings. sessionId（Non-routing mode does not jump)
      expect(mockState.setPreviousSessionId).toHaveBeenCalledWith('new-session-456');
      expect(mockState.setSessionId).toHaveBeenCalledWith('new-session-456');
      expect(sessionIdRef.current).toBe('new-session-456');

      // Verify no navigation (non-routing mode)
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('It should be handled. agentId No, I\'m not. 01 Situation', async () => {
      sessionIdRef.current = '';
      agentIdRef.current = 'agent-456';
      mockState.senderSending = false;

      const mockSession = {
        session_id: 'new-session-789',
        title: 'New Session',
        status: 'ACTIVE',
      };

      (mockAxiosPost as any).mockResolvedValue({ data: { data: mockSession, code: 200 } });

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Verify super_employee_id It's been passed right.
      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/app/api/v1/sessions/',
        expect.objectContaining({
          super_employee_id: 'agent-456',
        }),
        {},
      );
    });

    it('It should be handled. mode Parameters', async () => {
      sessionIdRef.current = '';
      mockState.senderSending = false;

      const mockSession = {
        session_id: 'new-session-mode',
        title: 'New Session',
        status: 'ACTIVE',
      };

      (mockAxiosPost as any).mockResolvedValue({ data: { data: mockSession, code: 200 } });

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      // Mock useAgentStore Return to Specific sessionMode
      (useAgentStore as any).mockReturnValue({
        sessionMode: 'my',
        chatEndpoint: undefined,
        sessionInfo: {},
        requestConfig: {
          extraHeaders: {},
        },
      });

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Verify mode Passed to createSession
      expect(mockAxiosPost).toHaveBeenCalledWith('/app/api/v1/sessions/', expect.objectContaining({ mode: 'my' }), {});

      // Verify navigation to new route
      expect(mockNavigate).toHaveBeenCalledWith('/chat/01/new-session-mode');
    });

  });

  describe('Processing while sending', () => {
    it('If sending and sending messages, add new messages to existing sessions', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = true;

      (mockAxiosPost as any).mockResolvedValue({ data: { code: 200 } });

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'New message', files: [] });
      });

      // Verify Call addNewMessage API
      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/app/api/v1/sessions/session-123/new_message',
        { message: 'New message', files: [] },
        {},
      );

      // Checking settings. loading Status
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(true);
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(true);
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);

      // Verify not called fetch（Because it's coming back.
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('If sending is not sending, the normal process should continue', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = true;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          type: 'client_tool_result',
          params: { call_id: '123', status: 'completed' },
          content: '',
        });
      });

      // Verify Call fetch（Not sending messages, so keep going.
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('interrupt_data Processing', () => {
    it('Should include interrupt_data In Request', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const interruptDataChunk = {
        detail: {
          interrupt_data: {
            task_id: 'task-123',
            step_id: 'step-456',
          },
        },
      };

      const previousMessage = {
        content: 'Previous message',
        detail: {
          attachments: [{ filename: 'file.pdf' }],
        },
      };

      mockState.pipelineMessages = [{ messages: [previousMessage] }, { messages: [interruptDataChunk] }];

      (findInterruptDataChunk as any).mockReturnValue(interruptDataChunk);

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Continue' });
      });

      // Prepare interrupt_data
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            interrupt_data: {
              task_id: 'task-123',
              step_id: 'step-456',
              content: 'Previous message',
              files: [{ filename: 'file.pdf' }],
            },
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'Continue',
            files: [],
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );
    });

    it('user_input interrupt_data Should keep the original content and not inject the last user message.', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const interruptDataChunk = {
        detail: {
          interrupt_data: {
            type: 'user_input',
            question_type: 'approval',
            question: 'Do you like programming?',
            options: ['Yeah.', 'I don\'t like it.'],
          },
        },
      };

      const previousMessage = {
        content: 'I\'m Wang.',
        detail: {
          attachments: [{ filename: 'previous.pdf' }],
        },
      };

      mockState.pipelineMessages = [{ messages: [previousMessage] }, { messages: [interruptDataChunk] }];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(interruptDataChunk);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'Yeah.',
          resumeContent: true,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            interrupt_data: {
              type: 'user_input',
              question_type: 'approval',
              question: 'Do you like programming?',
              options: ['Yeah.', 'I don\'t like it.'],
            },
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'true',
            files: [],
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );

      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Yeah.',
        }),
      );
      expect(currentMessageRef.current).toBe('Yeah.');
    });

    it('HITL multi_select resume content Should be sent in arrays while keeping readable user messages', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const interruptDataChunk = {
        detail: {
          interrupt_data: {
            type: 'user_input',
            question_type: 'multi_select',
            question: 'Which modes are acceptable?',
            options: ['Fast', 'Balanced', 'Accurate'],
          },
        },
      };

      mockState.pipelineMessages = [{ messages: [] }, { messages: [interruptDataChunk] }];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(interruptDataChunk);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'Fast, Accurate',
          resumeContent: ['Fast', 'Accurate'],
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            interrupt_data: {
              type: 'user_input',
              question_type: 'multi_select',
              question: 'Which modes are acceptable?',
              options: ['Fast', 'Balanced', 'Accurate'],
            },
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: '["Fast","Accurate"]',
            files: [],
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );

      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Fast, Accurate',
        }),
      );
    });

    it('HITL approval decisions It should be structured. content Send and keep original interrupt_data', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const interruptData = {
        action_requests: [
          {
            name: 'update_requirement_fields',
            args: { fields: [] },
            description: 'Are project needs fields updated?\n\n{"fields":[]}',
          },
        ],
        review_configs: [
          {
            action_name: 'update_requirement_fields',
            allowed_decisions: ['approve', 'reject'],
          },
        ],
      };
      const interruptDataChunk = {
        detail: {
          interrupt_data: interruptData,
        },
      };

      mockState.pipelineMessages = [{ messages: [] }, { messages: [interruptDataChunk] }];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(interruptDataChunk);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'Approve',
          resumeContent: {
            decisions: [{ type: 'approve' }],
          },
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            interrupt_data: interruptData,
            knowledge_query_request: {
              knowledge_ids: [],
            },
            type: 'user_message',
            content: {
              decisions: [{ type: 'approve' }],
            },
            files: [],
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );

      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Approve',
        }),
      );
    });

    it('HITL approval Sending text through chat box during pause should not automatically turn to rejection of decision-making', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const interruptData = {
        action_requests: [
          {
            name: 'update_requirement_fields',
            args: { fields: [] },
            description: 'Are project needs fields updated?',
          },
          {
            name: 'submit_artifact',
            args: { artifact_id: 'artifact-1' },
            description: 'Are the products agreed to be submitted?',
          },
        ],
        review_configs: [
          {
            action_name: 'update_requirement_fields',
            allowed_decisions: ['approve', 'reject'],
          },
          {
            action_name: 'submit_artifact',
            allowed_decisions: ['approve', 'reject'],
          },
        ],
      };
      const interruptDataChunk = {
        detail: {
          interrupt_data: interruptData,
        },
      };

      mockState.pipelineMessages = [{ messages: [] }, { messages: [interruptDataChunk] }];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(interruptDataChunk);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'Please change and implement it.',
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            interrupt_data: interruptData,
            knowledge_query_request: {
              knowledge_ids: [],
            },
            content: 'Please change and implement it.',
            files: [],
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );

      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Please change and implement it.',
        }),
      );
    });

    it('HITL approval Communications should be sent during the suspension approval card Structured decision-making provided', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const interruptData = {
        action_requests: [
          {
            name: 'update_requirement_fields',
            args: { fields: [] },
            description: 'Are project needs fields updated?',
          },
          {
            name: 'submit_artifact',
            args: { artifact_id: 'artifact-1' },
            description: 'Are the products agreed to be submitted?',
          },
        ],
        review_configs: [
          {
            action_name: 'update_requirement_fields',
            allowed_decisions: ['approve', 'reject'],
          },
          {
            action_name: 'submit_artifact',
            allowed_decisions: ['approve', 'reject'],
          },
        ],
      };
      const interruptDataChunk = {
        detail: {
          interrupt_data: interruptData,
        },
      };

      mockState.pipelineMessages = [{ messages: [] }, { messages: [interruptDataChunk] }];

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(interruptDataChunk);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          content: 'Please change and implement it.',
          resumeContent: {
            decisions: [
              { type: 'reject', message: 'Please change and implement it.' },
              { type: 'reject', message: 'Please change and implement it.' },
            ],
          },
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            interrupt_data: interruptData,
            knowledge_query_request: {
              knowledge_ids: [],
            },
            type: 'user_message',
            content: {
              decisions: [
                { type: 'reject', message: 'Please change and implement it.' },
                { type: 'reject', message: 'Please change and implement it.' },
              ],
            },
            files: [],
            mock: false,
            general_agent_mode: 'Default',
          }),
        }),
      );

      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Please change and implement it.',
        }),
      );
    });
  });

  describe('Send server action or client tool result', () => {
    it('Should send it. client_tool_result', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({
          type: 'client_tool_result',
          params: {
            call_id: 'call-123',
            status: 'completed',
            output: { result: 'success' },
          },
          content: '',
        });
      });

      expect(mockState.setPendingClientToolResult).toHaveBeenCalledWith(false);

      // Prepare type and params
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            knowledge_query_request: {
              knowledge_ids: [],
            },
            type: 'client_tool_result',
            params: {
              call_id: 'call-123',
              status: 'completed',
              output: { result: 'success' },
            },
          }),
        }),
      );

      // Verify the expected behavior. chunk
      expect(mockState.addChunk).not.toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
        }),
      );
    });
  });

  describe('Error handling', () => {
    it('It should be handled. fetch Failures', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const mockResponse = {
        ok: false,
        status: 500,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Verify reset status
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      expect(mockState.setSenderSending).toHaveBeenCalledWith(false);

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
    });

    it('It should be handled. AbortError', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      (global.fetch as any).mockRejectedValue(abortError);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Verify reset status
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      expect(mockState.setSenderSending).toHaveBeenCalledWith(false);

      // Check logs
      expect(consoleLogSpy).toHaveBeenCalledWith('Request was aborted in send');

      // Verify does not add error chunk
      expect(mockState.addChunk).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        }),
      );

      consoleLogSpy.mockRestore();
    });

    it('Should be able to handle the offline situation.', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      // Simulate network offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
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
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      // Set up old false and real messages
      const oldFakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}retry-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Reconnecting Tip',
      };
      const realChunk: MessageChunk = {
        id: 'real-chunk-1',
        role: 'user',
        type: 'text',
        content: 'Real news.',
      };
      mockState.chunks = [realChunk, oldFakeChunk];

      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      // Simulate network offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
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

    it('Should Add retry Clear old false messages before prompting', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      // Set up old false and real messages
      const oldFakeChunk: MessageChunk = {
        id: `${FAKE_CHUNK_PREFIX}offline-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Offline Hint',
      };
      const realChunk: MessageChunk = {
        id: 'real-chunk-1',
        role: 'user',
        type: 'text',
        content: 'Real news.',
      };
      mockState.chunks = [realChunk, oldFakeChunk];

      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
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

    it('Retry the timer should be set when the network is wrong', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Validation settings for retry timers
      expect(retryTimerRef.current).not.toBeNull();

      // Validate timer will be available RETRY_DELAY After Trigger sendContinue
      act(() => {
        vi.advanceTimersByTime(RETRY_DELAY);
      });

      expect(mockSendContinue).toHaveBeenCalledWith(0);
    });
  });

  describe('AbortController Processing', () => {
    it('Should abort previous requests and create new ones AbortController', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const oldAbortController = new AbortController();
      const abortSpy = vi.spyOn(oldAbortController, 'abort');
      mockState.abortController = oldAbortController;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Validation of pre-suspended request
      expect(abortSpy).toHaveBeenCalled();

      // New validation settings AbortController
      expect(mockState.setAbortController).toHaveBeenCalledWith(expect.any(AbortController));
    });

    it('It should be handled. abort Throw out an abnormal situation.', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

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
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      // It's not supposed to be a problem.
      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Validation continues to carry out the follow-up logic
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Status Management', () => {
    it('Should be set and reset correctly loading Status', async () => {
      sessionIdRef.current = 'session-123';
      mockState.senderSending = false;

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (findInterruptDataChunk as any).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useSend({
          sessionIdRef,
          basePathRef,
          agentIdRef,
          currentMessageRef,
          retryTimerRef,
          storeApi: mockStoreApi,
          handleResponse: mockHandleResponse,
          sendContinue: mockSendContinue,
          onSendComplete: mockOnSendComplete,
          enableSendContinue: true,
        }),
      );

      await act(async () => {
        await result.current.send({ content: 'Hello' });
      });

      // Checking settings. loading
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(true);
      // Validation reset. loading
      expect(mockState.setSenderLoading).toHaveBeenCalledWith(false);
      // Checking settings. sending
      expect(mockState.setSenderSending).toHaveBeenCalledWith(true);
    });
  });
});
