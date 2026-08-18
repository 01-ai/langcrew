import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createAgentStore } from '@/store/agent';
import { useRightPanelSync } from '../useRightPanelSync';

const source = {
  id: '1',
  type: 'web' as const,
  title: 'Example',
  url: 'https://example.com',
  snippet: 'Example snippet',
};

describe('useRightPanelSync citations', () => {
  it('notifies the host when citations open and close', () => {
    const storeApi = createAgentStore('citation-panel-sync');
    const onRightPanelVisibleChange = vi.fn();

    renderHook(() =>
      useRightPanelSync({
        previewConfig: { onRightPanelVisibleChange },
        storeApi,
      }),
    );

    act(() => storeApi.getState().openCitationPanel([source]));
    expect(onRightPanelVisibleChange).toHaveBeenLastCalledWith(true, 'user');

    act(() => storeApi.getState().closeCitationPanel());
    expect(onRightPanelVisibleChange).toHaveBeenLastCalledWith(false, 'user');
  });

  it('closes citations when an externally controlled panel is hidden', () => {
    const storeApi = createAgentStore('citation-panel-external-close');
    storeApi.getState().setAutoOpenRightPanel(false);
    const onRightPanelVisibleChange = vi.fn();
    const { rerender } = renderHook(
      ({ visible }: { visible?: boolean }) =>
        useRightPanelSync({
          previewConfig: {
            rightPanelVisible: visible,
            onRightPanelVisibleChange,
          },
          storeApi,
        }),
      { initialProps: { visible: undefined } },
    );

    act(() => storeApi.getState().openCitationPanel([source]));
    onRightPanelVisibleChange.mockClear();

    rerender({ visible: false });

    expect(storeApi.getState().citationPanelSources).toBeUndefined();
    expect(onRightPanelVisibleChange).not.toHaveBeenCalled();
  });
});

