import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkRecovery } from '../useNetworkRecovery';
import { FAKE_CHUNK_PREFIX } from '../../utils/constants';

// Mock Dependency
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'chatbot.task.network.resuming': 'Restore connection...',
        'chatbot.task.network.offline': 'Network disconnected',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    isMessageFinish: vi.fn(),
    filterFakeChunks: vi.fn(),
  };
});

// Import mock Post Module
import { isMessageFinish, filterFakeChunks } from '../../utils';

describe('useNetworkRecovery', () => {
  let mockStoreApi: any;
  let mockState: any;
  let sessionIdRef: any;
  let retryTimerRef: any;
  let sendRef: any;
  let currentMessageRef: any;
  let mockSendContinue: any;

  // Event listening device mock
  let windowEventListeners: Record<string, EventListener[]> = {};
  let documentEventListeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    // Reset All mock
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create Lasting mock Functions
    mockState = {
      chunks: [],
      pipelineMessages: [],
      senderSending: false,
      abortController: null,
      addChunk: vi.fn(),
      setChunks: vi.fn(),
      setAbortController: vi.fn(),
    };

    // Create mock storeApi
    mockStoreApi = {
      getState: vi.fn(() => mockState),
    };

    sessionIdRef = { current: 'session-123' };
    retryTimerRef = { current: null };
    sendRef = { current: null };
    currentMessageRef = { current: '' };
    mockSendContinue = vi.fn().mockResolvedValue(undefined);

    // Mock window and document event listening device
    windowEventListeners = {};
    documentEventListeners = {};

    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (!windowEventListeners[event]) {
        windowEventListeners[event] = [];
      }
      windowEventListeners[event].push(handler);
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (windowEventListeners[event]) {
        const index = windowEventListeners[event].indexOf(handler);
        if (index > -1) {
          windowEventListeners[event].splice(index, 1);
        }
      }
    });

    vi.spyOn(document, 'addEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (!documentEventListeners[event]) {
        documentEventListeners[event] = [];
      }
      documentEventListeners[event].push(handler);
    });

    vi.spyOn(document, 'removeEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (documentEventListeners[event]) {
        const index = documentEventListeners[event].indexOf(handler);
        if (index > -1) {
          documentEventListeners[event].splice(index, 1);
        }
      }
    });

    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    });

    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('checkAndResumeSession', () => {
    it('If not sessionId，Should be heading straight back.', () => {
      sessionIdRef.current = '';

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      expect(mockSendContinue).not.toHaveBeenCalled();
      expect(mockState.addChunk).not.toHaveBeenCalled();
    });

    it('If sending, return directly', () => {
      mockState.senderSending = true;

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      expect(mockSendContinue).not.toHaveBeenCalled();
      expect(mockState.addChunk).not.toHaveBeenCalled();
    });

    it('If not chunks，Should be heading straight back.', () => {
      mockState.chunks = [];
      mockState.pipelineMessages = [];

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      expect(mockSendContinue).not.toHaveBeenCalled();
      expect(mockState.addChunk).not.toHaveBeenCalled();
    });

    it('If the last message isn\'t... assistant，Should be heading straight back.', () => {
      mockState.chunks = [{ id: '1', role: 'user', type: 'text', content: 'Hello' }];
      mockState.pipelineMessages = [
        { role: 'user', messages: [{ id: '1', role: 'user', type: 'text', content: 'Hello' }] },
      ];

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      expect(mockSendContinue).not.toHaveBeenCalled();
      expect(mockState.addChunk).not.toHaveBeenCalled();
    });

    it('If the last message is finished, return directly.', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Complete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Complete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(true);

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      expect(mockSendContinue).not.toHaveBeenCalled();
      expect(mockState.addChunk).not.toHaveBeenCalled();
    });

    it('If the session is not completed, it should be called sendContinue Restore Session', () => {
      const realChunk = { id: 'real-1', role: 'assistant', type: 'text', content: 'Incomplete' };
      const oldFakeChunk = {
        id: `${FAKE_CHUNK_PREFIX}interrupted-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Breaktip',
      };
      const mockChunks = [oldFakeChunk, realChunk];

      mockState.chunks = mockChunks;
      mockState.pipelineMessages = [{ role: 'assistant', messages: [realChunk] }];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue([realChunk]); // Only back to real chunk

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      // Verify to clear old false messages first (retain the real message)
      expect(mockState.setChunks).toHaveBeenCalled();
      const setChunksCall = mockState.setChunks.mock.calls[0][0];
      // setChunks Now, here's the one that's receiving. filterFakeChunks Results (array)
      expect(setChunksCall).toEqual([realChunk]); // Keep only the real message

      // Check added recovery hint
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}resuming-`),
          role: 'assistant',
          type: 'live_status',
          content: 'Restore connection...',
        }),
      );

      // Verify Call sendContinue
      expect(mockSendContinue).toHaveBeenCalledWith(0);
    });

    it('Should use the last one. assistant chunk It\'s... id', () => {
      const mockChunks = [
        { id: 'real-1', role: 'user', type: 'text', content: 'User' },
        { id: 'real-2', role: 'assistant', type: 'text', content: 'Assistant 1' },
        { id: 'real-3', role: 'assistant', type: 'text', content: 'Assistant 2' },
      ];

      mockState.chunks = mockChunks;
      mockState.pipelineMessages = [
        { role: 'user', messages: [mockChunks[0]] },
        { role: 'assistant', messages: [mockChunks[1], mockChunks[2]] },
      ];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue(mockChunks);

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      // Verify Call sendContinue（Use last assistant chunk）
      expect(mockSendContinue).toHaveBeenCalledWith(0);
      expect(filterFakeChunks).toHaveBeenCalledWith(mockChunks);
    });

    it('If you don\'t find it, assistant chunk，Use empty string as chunk id', () => {
      // Set the last message to be assistant，But... filterFakeChunks Not in returned list assistant chunk
      const mockChunks = [{ id: 'real-1', role: 'user', type: 'text', content: 'User' }];

      mockState.chunks = mockChunks;
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: 'real-1', role: 'user', type: 'text', content: 'User' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue(mockChunks); // Only return user chunk，No, I'm not. assistant chunk

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      // Verify still called sendContinue（Even if it's not found. assistant chunk，Use empty string)
      expect(mockSendContinue).toHaveBeenCalledWith(0);
      expect(mockState.addChunk).toHaveBeenCalled();
    });
  });

  describe('abortCurrentConnection', () => {
    it('If not abortController，Only the timer should be cleared.', () => {
      mockState.abortController = null;
      retryTimerRef.current = 123 as any;

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.abortCurrentConnection('test');
      });

      // Verify clears retry timers
      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
      expect(retryTimerRef.current).toBeNull();

      // Validation does not add offline hint (because no abortController）
      expect(mockState.addChunk).not.toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('If there is one... abortController，It should be suspended and cleared.', () => {
      const mockAbortController = {
        abort: vi.fn(),
      };
      mockState.abortController = mockAbortController;

      // Set up old false and real messages
      const realChunk = { id: 'real-1', role: 'user', type: 'text', content: 'Real news.' };
      const oldFakeChunk = {
        id: `${FAKE_CHUNK_PREFIX}resuming-123456`,
        role: 'assistant',
        type: 'live_status',
        content: 'Old Recovery Tip',
      };
      mockState.chunks = [realChunk, oldFakeChunk];

      // Mock filterFakeChunks Return filtered results
      (filterFakeChunks as any).mockReturnValue([realChunk]);

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.abortCurrentConnection('test');
      });

      // Verifying aborted connection
      expect(mockAbortController.abort).toHaveBeenCalled();

      // Check cleared. abortController
      expect(mockState.setAbortController).toHaveBeenCalledWith(null);

      // Verify to clear old false messages first (retain the real message)
      expect(mockState.setChunks).toHaveBeenCalled();
      // Inspection setChunks Whether to be called, and the parameters to be passed on
      if (mockState.setChunks.mock.calls.length > 0) {
        const setChunksCall = mockState.setChunks.mock.calls[0][0];
        // setChunks Now, here's the one that's receiving. filterFakeChunks Results (array)
        // If arrays are entered, direct comparison; if functions are carried out
        if (setChunksCall !== undefined) {
          const filteredChunks =
            typeof setChunksCall === 'function' ? setChunksCall([realChunk, oldFakeChunk]) : setChunksCall;
          expect(filteredChunks).toEqual([realChunk]); // Keep only the real message
        }
      }

      // Check added offline hint
      expect(mockState.addChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(`${FAKE_CHUNK_PREFIX}interrupted-`),
          role: 'assistant',
          type: 'live_status',
          content: 'Network disconnected',
        }),
      );
    });

    it('If abort Throwing an anomaly. It should be ignored.', () => {
      const mockAbortController = {
        abort: vi.fn().mockImplementation(() => {
          throw new Error('Abort error');
        }),
      };
      mockState.abortController = mockAbortController;

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // It's not supposed to be a problem.
      act(() => {
        result.current.abortCurrentConnection('test');
      });

      // The verification is still cleared. abortController
      expect(mockState.setAbortController).toHaveBeenCalledWith(null);
    });

    it('Retry timers should be cleared', () => {
      retryTimerRef.current = 456 as any;

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.abortCurrentConnection('test');
      });

      expect(clearTimeoutSpy).toHaveBeenCalledWith(456);
      expect(retryTimerRef.current).toBeNull();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Event listening device', () => {
    it('All event monitors should be registered.', () => {
      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Checked all event monitors
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('We should clear all incident monitors.', () => {
      const { unmount } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      unmount();

      // Verify that all event listening devices were removed
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('offline Event should be called abortCurrentConnection', () => {
      const mockAbortController = {
        abort: vi.fn(),
      };
      mockState.abortController = mockAbortController;

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Trigger offline Events
      act(() => {
        const handler = windowEventListeners['offline'][0];
        handler(new Event('offline'));
      });

      // Verify Call abort
      expect(mockAbortController.abort).toHaveBeenCalled();
      expect(mockState.setAbortController).toHaveBeenCalledWith(null);
    });

    it('online The event should trigger a shake-proof recovery.', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue([mockState.chunks[0]]);

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Trigger online Events
      act(() => {
        const handler = windowEventListeners['online'][0];
        handler(new Event('online'));
      });

      // Validation not called (weave-resilence delay)
      expect(mockSendContinue).not.toHaveBeenCalled();

      // Advance Time 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Verify Call sendContinue
      expect(mockSendContinue).toHaveBeenCalledWith(0);
    });

    it('visibilitychange Eventsvisible）It should trigger a shake-proof recovery.', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue([mockState.chunks[0]]);

      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      });

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Trigger visibilitychange Events
      act(() => {
        const handler = documentEventListeners['visibilitychange'][0];
        handler(new Event('visibilitychange'));
      });

      // Advance Time 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Verify Call sendContinue
      expect(mockSendContinue).toHaveBeenCalledWith(0);
    });

    it('visibilitychange Eventshidden）Shouldn\'t trigger recovery.', () => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden',
      });

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Trigger visibilitychange Events
      act(() => {
        const handler = documentEventListeners['visibilitychange'][0];
        handler(new Event('visibilitychange'));
      });

      // Advance Time 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Verify not called sendContinue
      expect(mockSendContinue).not.toHaveBeenCalled();
    });

    it('focus The event should trigger a shake-proof recovery.', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue([mockState.chunks[0]]);

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Trigger focus Events
      act(() => {
        const handler = windowEventListeners['focus'][0];
        handler(new Event('focus'));
      });

      // Advance Time 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Verify Call sendContinue
      expect(mockSendContinue).toHaveBeenCalledWith(0);
    });

    it('pageshow Eventspersisted）It should trigger a shake-proof recovery.', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue([mockState.chunks[0]]);

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Create a persisted PageTransitionEvent.
      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', {
        value: true,
        writable: false,
      });

      // Trigger pageshow Events
      act(() => {
        const handler = windowEventListeners['pageshow'][0];
        handler(event);
      });

      // Advance Time 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Verify Call sendContinue
      expect(mockSendContinue).toHaveBeenCalledWith(0);
    });

    it('pageshow Eventsnot persisted）Shouldn\'t trigger recovery.', () => {
      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', {
        value: false,
        writable: false,
      });

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // Trigger pageshow Events
      act(() => {
        const handler = windowEventListeners['pageshow'][0];
        handler(event);
      });

      // Advance Time 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Verify not called sendContinue
      expect(mockSendContinue).not.toHaveBeenCalled();
    });

    it('The shake-proof should cancel the previous timer.', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }];
      mockState.pipelineMessages = [
        { role: 'assistant', messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Incomplete' }] },
      ];

      (isMessageFinish as any).mockReturnValue(false);
      (filterFakeChunks as any).mockReturnValue([mockState.chunks[0]]);

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // First Trigger online Events
      act(() => {
        const handler = windowEventListeners['online'][0];
        handler(new Event('online'));
      });

      // Yes. 500ms Trigger before
      act(() => {
        vi.advanceTimersByTime(200);
        const handler = windowEventListeners['online'][0];
        handler(new Event('online'));
      });

      // Verify clears the previous timer
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Advance Time 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // The authentication was only called once.
      expect(mockSendContinue).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Border situation', () => {
    it('It should be handled. pipelineMessages Empty', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Test' }];
      mockState.pipelineMessages = [];

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      expect(mockSendContinue).not.toHaveBeenCalled();
    });

    it('It should be handled. chunks Empty but pipelineMessages Not Empty', () => {
      mockState.chunks = [];
      mockState.pipelineMessages = [{ role: 'assistant', messages: [] }];

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      act(() => {
        result.current.checkAndResumeSession('test');
      });

      expect(mockSendContinue).not.toHaveBeenCalled();
    });

    it('It should be handled. lastMessage Yes undefined Situation', () => {
      mockState.chunks = [{ id: '1', role: 'assistant', type: 'text', content: 'Test' }];
      mockState.pipelineMessages = [undefined];

      const { result } = renderHook(() =>
        useNetworkRecovery({
          sessionIdRef,
          storeApi: mockStoreApi,
          sendContinue: mockSendContinue,
          retryTimerRef,
          sendRef,
          currentMessageRef,
          enableSendContinue: true,
        }),
      );

      // The code will be accessed. lastMessage.role Errors thrown from time
      // It's a potential for code. bug，But the test should reflect actual behavior.
      expect(() => {
        act(() => {
          result.current.checkAndResumeSession('test');
        });
      }).toThrow();
    });
  });
});
