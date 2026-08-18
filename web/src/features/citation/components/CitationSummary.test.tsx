import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CitationSource } from '@/types';
import CitationSummary from './CitationSummary';

vi.mock('@/assets/svg/citations/web.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/knowledge.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/file.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/memory.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/utils/file', () => ({
  getFileIcon: () => <span data-testid="file-type-icon" />,
}));
vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const sources: CitationSource[] = [
  { id: 'S1', type: 'web', title: 'Web 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
  { id: 'S2', type: 'web', title: 'Web 2', url: 'https://example.com/2', snippet: 'Snippet 2' },
  {
    id: 'S3',
    type: 'knowledge',
    source: 'knowledge',
    knowledge_id: 'kb-1',
    knowledge_name: 'Knowledge base',
    document_id: 'doc-2',
    document_name: 'Another knowledge document',
    chunk_id: 'chunk-1',
    content: 'First fragment',
    updated_at: null,
  },
  {
    id: 'S5',
    type: 'knowledge',
    source: 'knowledge',
    knowledge_id: 'kb-1',
    knowledge_name: 'Knowledge base',
    document_id: 'doc-1',
    document_name: 'Knowledge',
    chunk_id: 'chunk-2',
    content: 'Second fragment',
    updated_at: null,
  },
  {
    id: 'S6',
    type: 'knowledge',
    source: 'qa_knowledge',
    knowledge_id: 'kb-1',
    knowledge_name: 'QA knowledge base',
    qa_id: 'qa-1',
    question: 'How do I use this feature?',
    content: 'QA answer',
    updated_at: null,
  },
  {
    id: 'S4',
    type: 'memory',
    memory_id: 'memory-1',
    source_name: 'Memory',
    content: '[Memory](user-profile.md) — User profile',
  },
];

describe('CitationSummary', () => {
  beforeEach(() => {
    localStorage.setItem('i18nextLng', 'zh');
  });

  it('opens the source panel with only the selected source type', () => {
    const onOpen = vi.fn();
    render(<CitationSummary sources={sources} onOpen={onOpen} />);

    expect(screen.getByText('来源')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2 个网页' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '2 个知识库来源' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '1 条记忆引用' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '0 条文件引用' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '2 个网页' }));
    fireEvent.click(screen.getByRole('button', { name: '2 个知识库来源' }));
    fireEvent.click(screen.getByRole('button', { name: '1 条记忆引用' }));

    expect(onOpen).toHaveBeenNthCalledWith(1, sources.slice(0, 2));
    expect(onOpen).toHaveBeenNthCalledWith(2, sources.slice(2, 5));
    expect(onOpen).toHaveBeenNthCalledWith(3, [sources[5]]);
  });

  it('shows knowledge bases grouped with fragment counts on hover', async () => {
    const onOpen = vi.fn();
    render(<CitationSummary sources={sources} onOpen={onOpen} />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: '2 个知识库来源' }));

    await waitFor(() => {
      expect(screen.getByText('Knowledge base')).toBeTruthy();
      expect(screen.getByText('2 个片段')).toBeTruthy();
      expect(screen.getByText('QA knowledge base')).toBeTruthy();
      expect(screen.getByText('1 个片段')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Knowledge base' }));
    expect(onOpen).toHaveBeenCalledWith([sources[2], sources[3]]);
  });

  it('shows file citations with the shared detail preview on hover', async () => {
    const fileSources: CitationSource[] = [
      {
        id: 'F1',
        type: 'file',
        filename: '客户知识库运营手册.pdf',
        key: 'files/operations-manual.pdf',
        url: 'https://example.com/files/operations-manual.pdf',
        size: 23 * 1024,
        content_type: 'application/pdf',
      },
      {
        id: 'F2',
        type: 'file',
        filename: '客户服务指南.pdf',
        key: 'files/service-guide.pdf',
        url: 'https://example.com/files/service-guide.pdf',
        size: 18 * 1024,
        content_type: 'application/pdf',
      },
    ];
    render(<CitationSummary sources={fileSources} onOpen={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: '2 条文件引用' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '客户知识库运营手册.pdf' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '客户服务指南.pdf' })).toBeTruthy();
      expect(screen.getByText('23 KB')).toBeTruthy();
      expect(screen.getByText('18 KB')).toBeTruthy();
    });
  });
});
