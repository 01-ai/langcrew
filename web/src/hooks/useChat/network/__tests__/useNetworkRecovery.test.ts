import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentStore } from '@/store/agent';
import { useNetworkRecovery } from '../useNetworkRecovery';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useNetworkRecovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts the active stream when the browser goes offline', () => {
    const storeApi = createAgentStore('network-offline');
    const abort = vi.fn();
    storeApi.getState().setAbortController({ abort } as unknown as AbortController);
    const retryTimerRef = { current: null };

    renderHook(() => useNetworkRecovery({ storeApi, retryTimerRef }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(abort).toHaveBeenCalledOnce();
    expect(storeApi.getState().abortController).toBeNull();
    expect(storeApi.getState().chunks.at(-1)).toMatchObject({
      type: 'live_status',
      content: 'chatbot.task.network.offline',
    });
  });

  it('prompts for a retry after an unfinished response reconnects', () => {
    const storeApi = createAgentStore('network-online');
    storeApi.getState().setChunks([
      {
        id: 'assistant-1',
        role: 'assistant',
        type: 'text',
        content: 'partial response',
      },
    ]);
    const retryTimerRef = { current: null };

    renderHook(() => useNetworkRecovery({ storeApi, retryTimerRef }));

    act(() => {
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(500);
    });

    expect(storeApi.getState().chunks.at(-1)).toMatchObject({
      type: 'live_status',
      content: 'chatbot.task.network.resuming',
    });
  });

  it('resumes with send-continue when the capability is enabled', () => {
    const storeApi = createAgentStore('network-continue');
    storeApi.getState().setChunks([
      {
        id: 'assistant-1',
        role: 'assistant',
        type: 'text',
        content: 'partial response',
      },
    ]);
    const retryTimerRef = { current: null };
    const sendContinue = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useNetworkRecovery({
        storeApi,
        retryTimerRef,
        sendContinue,
        enableSendContinue: true,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(500);
    });

    expect(sendContinue).toHaveBeenCalledWith(0);
  });
});
