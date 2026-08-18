import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUrlContent } from '../useUrlContent';

describe('useUrlContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a fresh object URL when a cached PDF is opened again', async () => {
    const url = 'https://example.com/cached-preview.pdf';
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/pdf'),
      },
      arrayBuffer: vi.fn().mockResolvedValue(pdfBytes),
    });
    const createObjectURL = vi
      .fn()
      .mockReturnValueOnce('blob:https://example.com/first')
      .mockReturnValueOnce('blob:https://example.com/second');

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { createObjectURL });

    const firstPreview = renderHook(() => useUrlContent({ url }));

    await waitFor(() => {
      expect(firstPreview.result.current.blobUrl).toBe('blob:https://example.com/first');
    });
    firstPreview.unmount();

    const secondPreview = renderHook(() => useUrlContent({ url }));

    await waitFor(() => {
      expect(secondPreview.result.current.blobUrl).toBe('blob:https://example.com/second');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });
});
