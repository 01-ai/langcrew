import { describe, expect, it, vi } from 'vitest';
import { openCitationSource } from './useOpenCitationSource';
import type { CitationSource, E2BFile } from '@/types';

const file: E2BFile = {
  filename: 'report.pdf',
  path: '/report.pdf',
  url: 'https://example.com/report.pdf',
  size: 1024,
  content_type: 'application/pdf',
};

const createActions = () => ({
  setFileViewerFile: vi.fn(),
  setLastWorkspaceAction: vi.fn(),
  openCitationPanel: vi.fn(),
  openWindow: vi.fn(),
});

describe('openCitationSource', () => {
  it('opens Web sources in a safe new tab with their URL', async () => {
    const actions = createActions();
    const openedWindow = { opener: {} } as Window;
    actions.openWindow.mockReturnValue(openedWindow);

    const handled = await openCitationSource(
      {
        id: '1',
        type: 'web',
        title: 'Source',
        url: 'https://example.com/source',
        snippet: 'Source snippet',
      },
      actions,
    );

    expect(handled).toBe(true);
    expect(actions.openWindow).toHaveBeenCalledWith(
      'https://example.com/source',
      '_blank',
      'noopener,noreferrer',
    );
    expect(openedWindow.opener).toBeNull();
    expect(actions.setFileViewerFile).not.toHaveBeenCalled();
  });

  it('opens knowledge sources in the citation panel', async () => {
    const actions = createActions();
    const source: CitationSource = {
      id: 'S2',
      type: 'knowledge',
      source: 'knowledge',
      knowledge_id: 'kb-1',
      knowledge_name: 'iPhone价目表',
      document_id: 'doc-1',
      document_name: 'iPhone价目表.md',
      chunk_id: 'chunk-1',
      content: 'Knowledge excerpt',
      updated_at: null,
    };

    expect(await openCitationSource(source, actions)).toBe(true);
    expect(actions.openCitationPanel).toHaveBeenCalledWith([source]);
    expect(actions.openWindow).not.toHaveBeenCalled();
  });

  it('opens multiple knowledge sources together in the citation panel', async () => {
    const actions = createActions();
    const sources: CitationSource[] = [
      {
        id: 'S1',
        type: 'knowledge',
        source: 'knowledge',
        knowledge_id: 'kb-1',
        knowledge_name: 'Knowledge base',
        document_id: 'doc-1',
        document_name: 'Guide',
        chunk_id: 'chunk-1',
        content: 'First fragment',
        updated_at: null,
      },
      {
        id: 'S2',
        type: 'knowledge',
        source: 'knowledge',
        knowledge_id: 'kb-2',
        knowledge_name: 'Another knowledge base',
        document_id: 'doc-2',
        document_name: 'FAQ',
        chunk_id: 'chunk-2',
        content: 'Second fragment',
        updated_at: null,
      },
    ];

    expect(await openCitationSource(sources, actions)).toBe(true);
    expect(actions.openCitationPanel).toHaveBeenCalledWith(sources);
    expect(actions.openWindow).not.toHaveBeenCalled();
  });

  it('opens memory sources in the citation panel', async () => {
    const actions = createActions();
    const source: CitationSource = {
      id: 'M1',
      type: 'memory',
      memory_id: 'memory-1',
      source_name: 'User preferences',
      content: 'Prefers concise answers.',
    };

    expect(await openCitationSource(source, actions)).toBe(true);
    expect(actions.openCitationPanel).toHaveBeenCalledWith([source]);
    expect(actions.openWindow).not.toHaveBeenCalled();
  });

  it('maps backend file fields directly into the existing file viewer', async () => {
    const actions = createActions();
    const source: CitationSource = {
      id: 'file-1',
      type: 'file',
      filename: 'report.pdf',
      key: '/report.pdf',
      url: 'https://example.com/report.pdf',
      size: 1024,
      content_type: 'application/pdf',
    };

    expect(await openCitationSource(source, actions)).toBe(true);
    expect(actions.setLastWorkspaceAction).toHaveBeenCalledWith('user');
    expect(actions.setFileViewerFile).toHaveBeenCalledWith(file);
    expect(actions.openWindow).not.toHaveBeenCalled();
  });

  it('does nothing for unresolved sources', async () => {
    const actions = createActions();

    expect(
      await openCitationSource(
        {
          id: 'missing',
          type: 'unknown',
          title: 'Missing',
        },
        actions,
      ),
    ).toBe(false);
    expect(actions.openWindow).not.toHaveBeenCalled();
    expect(actions.setFileViewerFile).not.toHaveBeenCalled();
  });
});

