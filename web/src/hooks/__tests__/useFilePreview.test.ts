import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { runFilePreview, tryInterceptAutoPreview, useFilePreview } from '../useFilePreview';
import type { E2BFile } from '@/types';

const mockFile: E2BFile = {
  filename: 'test.pdf',
  url: 'https://example.com/test.pdf',
  content_type: 'application/pdf',
  size: 1024,
  path: '/test.pdf',
};

const createState = (overrides: Partial<Parameters<typeof runFilePreview>[0]> = {}) => {
  const setFileViewerFile = vi.fn();
  const setLastWorkspaceAction = vi.fn();

  return {
    layoutConfig: { narrowMode: false },
    fullscreenFilePreview: false,
    filePreviewConfig: undefined,
    setFileViewerFile,
    setLastWorkspaceAction,
    ...overrides,
  };
};

describe('runFilePreview', () => {
  it('opens workspace preview in page mode', () => {
    const state = createState();

    const result = runFilePreview(state, {
      file: mockFile,
      siblings: [mockFile],
      source: 'attachment',
    });

    expect(result).toEqual({ handled: false, mode: 'workspace' });
    expect(state.setLastWorkspaceAction).toHaveBeenCalledWith('user');
    expect(state.setFileViewerFile).toHaveBeenCalledWith(mockFile, [mockFile]);
  });

  it('returns modal mode in narrow layout without fullscreen', () => {
    const state = createState({ layoutConfig: { narrowMode: true } });

    const result = runFilePreview(state, {
      file: mockFile,
      siblings: [mockFile],
      source: 'attachment',
    });

    expect(result).toEqual({ handled: false, mode: 'modal' });
    expect(state.setFileViewerFile).not.toHaveBeenCalled();
  });

  it('opens workspace in narrow layout when fullscreenFilePreview is enabled', () => {
    const state = createState({
      layoutConfig: { narrowMode: true },
      fullscreenFilePreview: true,
    });

    const result = runFilePreview(state, {
      file: mockFile,
      siblings: [mockFile],
      source: 'attachment',
    });

    expect(result).toEqual({ handled: false, mode: 'workspace' });
    expect(state.setFileViewerFile).toHaveBeenCalledWith(mockFile, [mockFile]);
  });

  it('only calls onPreview without built-in fallback when onPreview is provided', () => {
    const onPreview = vi.fn();
    const state = createState({
      filePreviewConfig: { onPreview },
    });

    const result = runFilePreview(state, {
      file: mockFile,
      siblings: [mockFile],
      source: 'attachment',
    });

    expect(result).toEqual({ handled: true });
    expect(onPreview).toHaveBeenCalled();
    expect(state.setFileViewerFile).not.toHaveBeenCalled();
  });

  it('calls onOpenModal via defaultPreview in narrow modal mode', () => {
    const onOpenModal = vi.fn();
    const onPreview = vi.fn(({ defaultPreview }) => {
      defaultPreview();
    });
    const state = createState({
      layoutConfig: { narrowMode: true },
      filePreviewConfig: { onPreview },
    });

    runFilePreview(state, {
      file: mockFile,
      siblings: [mockFile],
      source: 'attachment',
      onOpenModal,
    });

    expect(onOpenModal).toHaveBeenCalled();
    expect(state.setFileViewerFile).not.toHaveBeenCalled();
  });
});

describe('tryInterceptAutoPreview', () => {
  it('returns false when interceptAutoPreview is disabled', () => {
    const state = createState({
      filePreviewConfig: {
        onPreview: vi.fn(() => true),
      },
    });

    expect(tryInterceptAutoPreview(state, mockFile, [mockFile])).toBe(false);
    expect(state.setFileViewerFile).not.toHaveBeenCalled();
  });

  it('only calls onPreview without auto fallback when interceptAutoPreview is enabled', () => {
    const onPreview = vi.fn();
    const state = createState({
      filePreviewConfig: {
        interceptAutoPreview: true,
        onPreview,
      },
    });

    expect(tryInterceptAutoPreview(state, mockFile, [mockFile])).toBe(true);
    expect(onPreview).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'auto', file: mockFile, siblings: [mockFile] }),
    );
    expect(state.setFileViewerFile).not.toHaveBeenCalled();
  });

  it('opens workspace auto preview via defaultPreview when business opts in', () => {
    const onPreview = vi.fn(({ defaultPreview }) => {
      defaultPreview();
    });
    const state = createState({
      filePreviewConfig: {
        interceptAutoPreview: true,
        onPreview,
      },
    });

    expect(tryInterceptAutoPreview(state, mockFile, [mockFile])).toBe(true);
    expect(state.setLastWorkspaceAction).toHaveBeenCalledWith('auto');
    expect(state.setFileViewerFile).toHaveBeenCalledWith(mockFile, [mockFile]);
  });
});

vi.mock('@/store', () => ({
  useAgentStore: vi.fn(),
}));

import { useAgentStore } from '@/store';

describe('useFilePreview', () => {
  beforeEach(() => {
    vi.mocked(useAgentStore).mockReturnValue(createState() as any);
  });

  it('delegates to runFilePreview via previewFile', () => {
    const state = createState();
    vi.mocked(useAgentStore).mockReturnValue(state as any);

    const { result } = renderHook(() => useFilePreview());

    act(() => {
      const previewResult = result.current.previewFile({
        file: mockFile,
        siblings: [mockFile],
        source: 'allFiles',
      });
      expect(previewResult).toEqual({ handled: false, mode: 'workspace' });
    });

    expect(state.setFileViewerFile).toHaveBeenCalledWith(mockFile, [mockFile]);
  });
});
