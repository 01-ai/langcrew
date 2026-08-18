import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CitationPanel from './CitationPanel';
import { AgentStoreProvider, useAgentStore } from '@/store';
import type { CitationSource, E2BFile } from '@/types';

vi.mock('@/assets/svg/citations/web.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/knowledge.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/file.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/memory.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/close.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/utils/file', () => ({
  getFileIcon: () => <span data-testid="file-type-icon" />,
}));

const CitationPanelFixture = ({ sources }: { sources: CitationSource[] }) => {
  const { openCitationPanel, fileViewerFile } = useAgentStore();

  useEffect(() => {
    openCitationPanel(sources);
  }, [openCitationPanel, sources]);

  return (
    <>
      <CitationPanel />
      <span data-testid="selected-file">
        {(fileViewerFile as E2BFile | undefined)?.filename || ''}
      </span>
    </>
  );
};

const renderPanel = (sources: CitationSource[], instanceKey: string) =>
  render(
    <AgentStoreProvider instanceKey={instanceKey}>
      <CitationPanelFixture sources={sources} />
    </AgentStoreProvider>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CitationPanel', () => {
  it('opens web sources in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPanel(
      [
        {
          id: '1',
          type: 'web',
          title: 'Example source',
          url: 'https://example.com/article',
          snippet: 'Example snippet',
        },
      ],
      'citation-panel-web',
    );

    fireEvent.click(screen.getByRole('button', { name: /Example source/ }));

    expect(open).toHaveBeenCalledWith(
      'https://example.com/article',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('switches file sources to the existing file viewer state', async () => {
    renderPanel(
      [
        {
          id: 'file-1',
          type: 'file',
          filename: 'Report.pdf',
          key: '/report.pdf',
          url: 'https://example.com/report.pdf',
          size: 1024,
          content_type: 'application/pdf',
        },
      ],
      'citation-panel-file',
    );

    fireEvent.click(screen.getByRole('button', { name: /Report/ }));

    await waitFor(() => {
      expect(screen.getByTestId('selected-file').textContent).toBe('Report.pdf');
      expect(screen.queryByText('Sources')).toBeNull();
    });
  });

  it('closes the source panel', () => {
    renderPanel(
      [
        {
          id: '1',
          type: 'knowledge',
          source: 'knowledge',
          knowledge_id: 'kb-1',
          knowledge_name: 'Knowledge base',
          document_id: 'doc-1',
          document_name: 'Knowledge source',
          chunk_id: 'chunk-1',
          content: 'Knowledge excerpt',
          updated_at: null,
        },
      ],
      'citation-panel-close',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close sources' }));

    expect(screen.queryByText('Sources')).toBeNull();
  });

  it('groups knowledge fragments by knowledge base in the panel', () => {
    const knowledgeSource = {
      type: 'knowledge' as const,
      source: 'knowledge' as const,
      knowledge_id: 'kb-1',
      knowledge_name: 'Knowledge base',
      document_id: 'doc-1',
      document_name: 'Knowledge source',
      content: 'Knowledge excerpt',
      updated_at: null,
    };
    renderPanel(
      [
        { ...knowledgeSource, id: 'S1', chunk_id: 'chunk-1' },
        { ...knowledgeSource, id: 'S2', chunk_id: 'chunk-2' },
        {
          ...knowledgeSource,
          id: 'S3',
          document_id: 'doc-2',
          document_name: 'Another knowledge source',
          chunk_id: 'chunk-3',
          content: 'Another knowledge excerpt',
        },
        {
          id: 'Q1',
          type: 'knowledge',
          source: 'qa_knowledge',
          knowledge_id: 'kb-1',
          knowledge_name: 'QA knowledge base',
          qa_id: 'qa-1',
          question: 'What is a QA citation?',
          content: 'QA answer',
          updated_at: null,
        },
      ],
      'citation-panel-knowledge-groups',
    );

    expect(screen.getByText('Knowledge base·2')).toBeTruthy();
    expect(screen.getByText('Knowledge base')).toBeTruthy();
    expect(screen.getByText('QA knowledge base')).toBeTruthy();
    expect(screen.getByText('Knowledge source')).toBeTruthy();
    expect(screen.getByText(/3 fragments/)).toBeTruthy();
    expect(screen.getAllByText('Knowledge excerpt')).toHaveLength(2);
    expect(screen.getByText('Another knowledge excerpt')).toBeTruthy();
    expect(screen.getByText('What is a QA citation?')).toBeTruthy();
  });

  it('renders memory sources with the dedicated memory card', () => {
    renderPanel(
      [
        {
          id: 'M1',
          type: 'memory',
          memory_id: 'memory-1',
          source_name: 'User preferences',
          content: 'Prefers concise answers.',
        },
      ],
      'citation-panel-memory',
    );

    expect(screen.getByText('User preferences')).toBeTruthy();
    expect(screen.getByText('Prefers concise answers.')).toBeTruthy();
  });
});

