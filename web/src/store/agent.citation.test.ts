import { describe, expect, it } from 'vitest';
import { createAgentStore } from './agent';
import type { CitationSource, E2BFile } from '@/types';

const source: CitationSource = {
  id: '1',
  type: 'web',
  title: 'Example',
  url: 'https://example.com',
  snippet: 'Example snippet',
};

const file: E2BFile = {
  filename: 'report.pdf',
  path: '/report.pdf',
  url: 'https://example.com/report.pdf',
  size: 1024,
  content_type: 'application/pdf',
};

describe('citation panel store', () => {
  it('opens citations and closes workspace and file viewer', () => {
    const store = createAgentStore('citation-open');
    store.setState({
      workspaceVisible: true,
      fileViewerFile: file,
      fileViewerMaximized: true,
    });

    store.getState().openCitationPanel([source]);

    expect(store.getState().citationPanelSources).toEqual([source]);
    expect(store.getState().workspaceVisible).toBe(false);
    expect(store.getState().fileViewerFile).toBeUndefined();
    expect(store.getState().fileViewerMaximized).toBe(false);
  });

  it('keeps workspace, file viewer, and citations mutually exclusive', () => {
    const store = createAgentStore('citation-exclusive');

    store.getState().openCitationPanel([source]);
    store.getState().setWorkspaceVisible(true);
    expect(store.getState().citationPanelSources).toBeUndefined();

    store.getState().openCitationPanel([source]);
    store.getState().setFileViewerFile(file, [file]);
    expect(store.getState().citationPanelSources).toBeUndefined();
    expect(store.getState().workspaceVisible).toBe(false);
  });

  it('clears citations when the store resets', () => {
    const store = createAgentStore('citation-reset');
    store.getState().openCitationPanel([source]);

    store.getState().resetStore();

    expect(store.getState().citationPanelSources).toBeUndefined();
  });
});

