import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CitationElement from './CitationElement';
import Markdown from '..';
import { CitationSourceIcon } from '@/features/citation/components/CitationSourceIcon';

vi.mock('@/assets/svg/citations/web.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/knowledge.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/file.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/memory.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/left.svg?react', () => ({ default: () => <span /> }));
vi.mock('@/assets/svg/citations/right.svg?react', () => ({ default: () => <span /> }));

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('CitationElement', () => {
  it('reuses a recent favicon failure for the same URL', () => {
    const source = {
      id: 'favicon-source',
      type: 'web' as const,
      title: 'Favicon source',
      url: 'https://example.com',
      favicon_url: 'https://example.com/broken-favicon.png',
      snippet: 'Preview',
    };
    const firstRender = render(<CitationSourceIcon source={source} />);
    const image = firstRender.container.querySelector('img');

    expect(image).toBeTruthy();
    fireEvent.error(image as HTMLImageElement);
    expect(firstRender.container.querySelector('img')).toBeNull();
    firstRender.unmount();

    const secondRender = render(<CitationSourceIcon source={source} />);
    expect(secondRender.container.querySelector('img')).toBeNull();
  });

  it('renders the [[citation:id]] markdown syntax', () => {
    render(
      <Markdown
        content="Market data[[citation:source-1]]"
        citations={[
          {
            id: 'source-1',
            type: 'web',
            title: 'Market source',
            site_name: 'Example News',
            url: 'https://example.com/market',
            snippet: 'Market preview',
          },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Example News' })).toBeTruthy();
    expect(screen.queryByText('Market source')).toBeNull();
    expect(screen.queryByText('[[citation:source-1]]')).toBeNull();
  });

  it('renders a resolved source pill and opens the source', () => {
    const onOpen = vi.fn();
    const source = {
      id: 'source-1',
      type: 'web' as const,
      title: 'S&P 500',
      url: 'https://example.com/sp500',
      snippet: 'S&P 500 preview',
    };

    render(
      <CitationElement citations={[source]} onOpen={onOpen}>
        source-1
      </CitationElement>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'S&P 500' }));

    expect(screen.getByText('S&P 500')).toBeTruthy();
    expect(onOpen).toHaveBeenCalledWith(source);
  });

  it('shows source details on hover', async () => {
    render(
      <CitationElement
        citations={[
          {
            id: '1',
            type: 'knowledge',
            source: 'knowledge',
            knowledge_id: 'kb-1',
            knowledge_name: 'Knowledge base',
            document_id: 'doc-1',
            document_name: 'Knowledge source',
            chunk_id: 'chunk-1',
            content: 'A preview of the cited content.',
            updated_at: null,
          },
        ]}
      >
        1
      </CitationElement>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Knowledge base' }));

    await waitFor(() => {
      expect(screen.getByText('A preview of the cited content.')).toBeTruthy();
    });
  });

  it('groups mixed citation types into separate pills in display order', async () => {
    const onOpen = vi.fn();
    const knowledge = {
      id: 'S2',
      type: 'knowledge' as const,
      source: 'knowledge' as const,
      knowledge_id: 'kb-1',
      knowledge_name: 'Knowledge base',
      document_id: 'doc-2',
      document_name: 'Knowledge source',
      chunk_id: 'chunk-2',
      content: 'Knowledge preview',
      updated_at: null,
    };
    const memory = {
      id: 'S4',
      type: 'memory' as const,
      memory_id: 'memory-1',
      source_name: 'Memory source',
      content: 'Memory preview',
    };
    const web = {
      id: 'S5',
      type: 'web' as const,
      title: 'Web source',
      url: 'https://example.com/web',
      snippet: 'Web preview',
    };

    render(
      <Markdown
        content="Supported claim[[citation:S2,S4,S5]]"
        citations={[knowledge, memory, web]}
        onCitationOpen={onOpen}
      />,
    );

    const webPill = screen.getByRole('button', { name: 'Web source' });
    const knowledgePill = screen.getByRole('button', { name: 'Knowledge base' });
    const memoryPill = screen.getByRole('button', { name: 'Memory source' });

    expect(webPill.compareDocumentPosition(knowledgePill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(knowledgePill.compareDocumentPosition(memoryPill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.mouseEnter(webPill);
    await waitFor(() => {
      expect(screen.getByText('Web preview')).toBeTruthy();
      expect(screen.queryByText('1/2')).toBeNull();
    });

    fireEvent.click(knowledgePill);
    expect(onOpen).toHaveBeenCalledWith([knowledge]);
  });

  it('shows every knowledge fragment and opens all knowledge sources from the pill', async () => {
    const onOpen = vi.fn();
    const first = {
      id: 'K1',
      type: 'knowledge' as const,
      source: 'knowledge' as const,
      knowledge_id: 'kb-1',
      knowledge_name: 'Knowledge base A',
      document_id: 'doc-1',
      document_name: 'Guide A',
      chunk_id: 'chunk-1',
      content: 'First knowledge fragment',
      updated_at: null,
    };
    const second = {
      id: 'K2',
      type: 'knowledge' as const,
      source: 'knowledge' as const,
      knowledge_id: 'kb-2',
      knowledge_name: 'Knowledge base B',
      document_id: 'doc-2',
      document_name: 'Guide B',
      chunk_id: 'chunk-2',
      content: 'Second knowledge fragment',
      updated_at: null,
    };

    render(
      <Markdown
        content="Supported claim[[citation:K1,K2]]"
        citations={[first, second]}
        onCitationOpen={onOpen}
      />,
    );

    const pill = screen.getByRole('button', { name: 'Knowledge base A' });
    fireEvent.click(pill);
    expect(onOpen).toHaveBeenCalledWith([first, second]);

    fireEvent.mouseEnter(pill);
    await waitFor(() => {
      expect(screen.getByText('First knowledge fragment')).toBeTruthy();
      expect(screen.getByText('Second knowledge fragment')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Previous source' })).toBeNull();
  });

  it('keeps same-type sources in one pill with navigation', async () => {
    const onOpen = vi.fn();
    const first = {
      id: 'S1',
      type: 'web' as const,
      title: 'First source',
      url: 'https://example.com/first',
      snippet: 'First preview',
    };
    const second = {
      id: 'S2',
      type: 'web' as const,
      title: 'Second source',
      url: 'https://example.com/second',
      snippet: 'Second preview',
    };

    render(
      <Markdown
        content="Supported claim[[citation:S1,S2]]"
        citations={[first, second]}
        onCitationOpen={onOpen}
      />,
    );

    const pill = screen.getByRole('button', { name: 'First source' });
    expect(screen.getByText('+1')).toBeTruthy();
    fireEvent.mouseEnter(pill);

    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeTruthy();
      expect(screen.getByText('First preview')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next source' }));

    await waitFor(() => {
      expect(screen.getByText('2/2')).toBeTruthy();
      expect(screen.getByText('Second preview')).toBeTruthy();
    });

    fireEvent.click(pill);
    expect(onOpen).toHaveBeenCalledWith(second);
  });

  it('shows backend memory content and opens memory citations', async () => {
    const onOpen = vi.fn();
    const source = {
      id: 'S1',
      type: 'memory' as const,
      memory_id: '8379695e0e7ea596',
      source_name: '用户基本信息',
      content: '[用户基本信息](user-profile.md) — 用户性别为男性',
    };
    render(
      <CitationElement
        citations={[source]}
        onOpen={onOpen}
      >
        S1
      </CitationElement>,
    );

    const button = screen.getByRole('button', { name: '用户基本信息' });
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.mouseEnter(button.parentElement as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('[用户基本信息](user-profile.md) — 用户性别为男性')).toBeTruthy();
    });
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith(source);
  });

  it('falls back to a disabled id pill when a source cannot be resolved', () => {
    render(<CitationElement>missing-id</CitationElement>);

    const button = screen.getByRole('button', { name: 'missing-id' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('renders a file citation whose id contains an underscore', () => {
    const source = {
      filename: '火山-创智11月份账单(1).csv',
      key: 'feilian-106/conversation/example/bill.csv',
      url: 'https://example.com/bill.csv',
      size: 12236,
      content_type: 'text/csv',
      id: 'C_MVSGQI3OGP',
      type: 'file' as const,
    };

    render(
      <Markdown
        content="根据账单[[citation:C_MVSGQI3OGP]]统计本月费用。"
        citations={[source]}
      />,
    );

    expect(screen.getByRole('button', { name: '火山-创智11月份账单(1).csv' })).toBeTruthy();
    expect(screen.queryByText('[[citation:C_MVSGQI3OGP]]')).toBeNull();
    expect(screen.queryByText('C_MVSGQI3OGP')).toBeNull();
  });
});

