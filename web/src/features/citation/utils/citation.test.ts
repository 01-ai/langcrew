import { describe, expect, it } from 'vitest';
import {
  extractCitationIds,
  formatCitationDate,
  getCitationExcerpt,
  getCitationSourceName,
  getCitationTitle,
  getReferencedCitationSources,
  groupCitationSourcesByType,
  groupKnowledgeCitationSources,
  groupKnowledgeCitationSourcesByKnowledgeBase,
  mergeCitationSources,
  transformCitationSyntax,
} from './citation';
import type { MessageItem } from '@/types';
import { transformChunksToMessages } from '@/hooks/useChat/transformChunksToMessages';

describe('citation utils', () => {
  it('extracts unique citation ids in first-seen order', () => {
    expect(
      extractCitationIds(
        'Alpha[[citation:source-a,2]] Beta[[citation:2]] Again[[citation:source-a]]',
      ),
    ).toEqual(['source-a', '2']);
  });

  it('ignores citation syntax inside code', () => {
    expect(
      extractCitationIds(
        '`[[citation:inline]]`\n```\n[[citation:block]]\n```\nVisible[[citation:real]]',
      ),
    ).toEqual(['real']);
  });

  it('transforms only citation syntax outside code into render nodes', () => {
    expect(
      transformCitationSyntax(
        'Visible[[citation:source-1, source-2]] `[[citation:inline]]`\n```\n[[citation:block]]\n```',
      ),
    ).toBe(
      'Visible<citation>source-1,source-2</citation> `[[citation:inline]]`\n```\n[[citation:block]]\n```',
    );
    expect(extractCitationIds('Legacy[citation:1]')).toEqual([]);
    expect(extractCitationIds('Legacy<sup>1</sup>')).toEqual([]);
  });

  it('merges immediately adjacent citation markers into one group', () => {
    expect(
      transformCitationSyntax(
        'Claim[[citation:S20,S21,S17,S13]][[citation:S30,S31,S37,S33]]',
      ),
    ).toBe('Claim<citation>S20,S21,S17,S13,S30,S31,S37,S33</citation>');
    expect(
      transformCitationSyntax('Claim[[citation:S1,S2]][[citation:S2,S3]] next[[citation:S4]]'),
    ).toBe('Claim<citation>S1,S2,S3</citation> next<citation>S4</citation>');
    expect(transformCitationSyntax('A[[citation:S1]] [[citation:S2]]')).toBe(
      'A<citation>S1</citation> <citation>S2</citation>',
    );
  });

  it('merges source updates by normalized id', () => {
    expect(
      mergeCitationSources(
        [
          {
            id: '1',
            type: 'web',
            title: 'Old title',
            url: 'https://example.com',
            snippet: 'Old snippet',
          },
        ],
        [
          {
            id: ' 1 ',
            type: 'web',
            title: 'New title',
            url: 'https://example.com',
            snippet: 'New snippet',
          },
        ],
      ),
    ).toEqual([
      {
        id: '1',
        type: 'web',
        title: 'New title',
        url: 'https://example.com',
        snippet: 'New snippet',
      },
    ]);
  });

  it('orders sources by references and creates unresolved fallbacks', () => {
    const message: MessageItem = {
      role: 'assistant',
      citations: [
        {
          id: '2',
          type: 'knowledge',
          source: 'knowledge',
          knowledge_id: 'kb-1',
          knowledge_name: 'Knowledge base',
          document_id: 'doc-1',
          document_name: 'Knowledge source.md',
          chunk_id: 'chunk-1',
          content: 'Knowledge excerpt',
          updated_at: null,
        },
      ],
      messages: [
        {
          type: 'text',
          content: 'First[[citation:1,2]]',
        },
      ],
    };

    expect(getReferencedCitationSources(message)).toEqual([
      { id: '1', type: 'unknown', title: '1' },
      message.citations?.[0],
    ]);
  });

  it('resolves file citations nested inside a running plan step', () => {
    const source = {
      filename: '火山-创智11月份账单(1).csv',
      key: 'feilian-106/conversation/example/bill.csv',
      url: 'https://example.com/bill.csv',
      size: 12236,
      content_type: 'text/csv',
      id: 'C_MVSGQI3OGP',
      type: 'file' as const,
    };
    const [message] = transformChunksToMessages([
      {
        role: 'assistant',
        type: 'plan',
        content: '',
        detail: {
          steps: [
            { id: '1', title: '读取账单', description: '', status: 'success' },
            { id: '4', title: '输出分析报告', description: '', status: 'running' },
          ],
        },
      } as any,
      {
        role: 'assistant',
        type: 'text',
        content: '报告结论[[citation:C_MVSGQI3OGP]]',
        detail: {
          citation_sources: [source],
        },
      },
    ]);

    const plan = message.messages.find((chunk) => chunk.type === 'plan') as any;
    expect(plan.children[1].children[0].content).toContain('[[citation:C_MVSGQI3OGP]]');
    expect(getReferencedCitationSources(message)).toEqual([source]);
  });

  it('keeps plan-step citations when top-level text also has markers', () => {
    const fileSource = {
      filename: '火山-创智11月份账单(1).csv',
      key: 'feilian-106/conversation/example/bill.csv',
      url: 'https://example.com/bill.csv',
      size: 12236,
      content_type: 'text/csv',
      id: 'C_MVSGQI3OGP',
      type: 'file' as const,
    };
    const webSource = {
      id: 'S1',
      type: 'web' as const,
      title: 'Web source',
      url: 'https://example.com/article',
      snippet: 'Snippet',
    };
    const message: MessageItem = {
      role: 'assistant',
      citations: [webSource],
      messages: [
        {
          type: 'text',
          content: 'Web[[citation:S1]]',
        },
        {
          type: 'plan',
          content: '',
          children: [
            {
              id: '4',
              title: '输出分析报告',
              description: '',
              status: 'success',
              children: [
                {
                  type: 'text',
                  content: '报告[[citation:C_MVSGQI3OGP]]',
                  detail: { citation_sources: [fileSource] },
                },
              ],
            },
          ],
        } as any,
      ],
    };

    expect(getReferencedCitationSources(message).map((source) => source.id)).toEqual([
      'S1',
      'C_MVSGQI3OGP',
    ]);
  });

  it('carries backend citation_sources onto the assistant turn without renaming fields', () => {
    const source = {
      title: 'Example',
      url: 'https://example.com/article',
      site_name: 'example.com',
      favicon_url: 'https://example.com/favicon.ico',
      published_at: '2026-08-04T14:11:00+08:00',
      snippet: 'Example excerpt',
      id: '1',
      type: 'web' as const,
    };
    const messages = transformChunksToMessages([
      {
        role: 'assistant',
        type: 'text',
        content: 'Answer[[citation:1]]',
        detail: {
          streaming: true,
          citation_sources: [source],
        },
      },
      {
        role: 'assistant',
        type: 'finish_reason',
        content: '',
      },
    ]);

    expect(messages[0].citations).toEqual([source]);
  });

  it('merges citation_sources from incremental SSE chunks by source id', () => {
    const messages = transformChunksToMessages([
      {
        role: 'assistant',
        type: 'text',
        content: 'First[[citation:S1]]',
        detail: {
          streaming: true,
          citation_sources: [
            {
              id: 'S1',
              type: 'web',
              title: 'Initial title',
              url: 'https://example.com/article',
              snippet: 'Initial snippet',
            },
          ],
        },
      },
      {
        role: 'assistant',
        type: 'text',
        content: 'Second',
        detail: {
          streaming: true,
          citation_sources: [
            {
              id: 'S1',
              type: 'web',
              title: 'Updated title',
              url: 'https://example.com/article',
              snippet: 'Updated snippet',
            },
          ],
        },
      },
    ]);

    expect(messages[0].citations).toEqual([
      {
        id: 'S1',
        type: 'web',
        title: 'Updated title',
        url: 'https://example.com/article',
        snippet: 'Updated snippet',
      },
    ]);
  });

  it('collects all eight Web sources referenced by a response', () => {
    const citationSources = Array.from({ length: 8 }, (_, index) => ({
      id: `S${index + 1}`,
      type: 'web' as const,
      title: `Web source ${index + 1}`,
      url: `https://example.com/${index + 1}`,
      site_name: 'example.com',
      snippet: `Web snippet ${index + 1}`,
    }));
    const [message] = transformChunksToMessages([
      {
        role: 'assistant',
        type: 'text',
        content:
          'First claim[[citation:S1,S2,S3,S4]] Second claim[[citation:S5,S6,S7,S8]]',
        detail: {
          streaming: true,
          citation_sources: citationSources,
        },
      },
    ]);

    expect(getReferencedCitationSources(message)).toHaveLength(8);
    expect(message.citations).toEqual(citationSources);
  });

  it('uses backend memory fields without converting them', () => {
    const source = {
      memory_id: '8379695e0e7ea596',
      source_name: '用户基本信息',
      content: '[用户基本信息](user-profile.md) — 用户性别为男性',
      id: 'S1',
      type: 'memory' as const,
    };
    const [message] = transformChunksToMessages([
      {
        role: 'assistant',
        type: 'text',
        content: '根据我的记忆，你是男性。[[citation:S1]]',
        detail: {
          citation_sources: [source],
        },
      },
    ]);

    expect(message.citations).toEqual([source]);
    expect(getCitationTitle(source)).toBe('用户基本信息');
    expect(getCitationExcerpt(source)).toBe(source.content);
    expect(
      getCitationTitle({
        id: 'S2',
        type: 'memory',
        memory_id: 'memory-without-name',
        content: 'Memory content',
      }),
    ).toBe('S2');
  });

  it('groups knowledge citations by document and counts chunks', () => {
    const base = {
      type: 'knowledge' as const,
      source: 'knowledge' as const,
      knowledge_id: 'kb-1',
      knowledge_name: 'iPhone价目表',
      document_id: 'doc-1',
      document_name: 'iPhone价目表.md',
      content: 'Excerpt',
      updated_at: null,
    };
    const groups = groupKnowledgeCitationSources([
      { ...base, id: 'S1', chunk_id: 'chunk-1' },
      { ...base, id: 'S2', chunk_id: 'chunk-2' },
      { ...base, id: 'S3', chunk_id: 'chunk-2' },
    ]);

    expect(groups).toHaveLength(1);
    expect(getCitationTitle(groups[0].source)).toBe('iPhone价目表');
    expect(getCitationSourceName(groups[0].source)).toBe('iPhone价目表.md');
    expect(groups[0].fragmentCount).toBe(2);
  });

  it('keeps QA knowledge entries separate from document groups', () => {
    const common = {
      type: 'knowledge' as const,
      knowledge_id: 'kb-1',
      knowledge_name: 'Support knowledge',
      content: 'Answer content',
      updated_at: null,
    };
    const groups = groupKnowledgeCitationSources([
      {
        ...common,
        id: 'D1',
        source: 'knowledge',
        document_id: 'doc-1',
        document_name: 'Guide.md',
        chunk_id: 'chunk-1',
      },
      {
        ...common,
        id: 'Q1',
        source: 'qa_knowledge',
        qa_id: 'qa-1',
        question: 'How do I reset my password?',
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => getCitationSourceName(group.source))).toEqual([
      'Guide.md',
      'How do I reset my password?',
    ]);
    expect(groups.map((group) => group.fragmentCount)).toEqual([1, undefined]);
  });

  it('groups knowledge citations by knowledge base with fragment counts', () => {
    const groups = groupKnowledgeCitationSourcesByKnowledgeBase([
      {
        id: 'S1',
        type: 'knowledge',
        source: 'knowledge',
        knowledge_id: 'kb-1',
        knowledge_name: 'Knowledge base A',
        document_id: 'doc-1',
        document_name: 'Doc',
        chunk_id: 'chunk-1',
        content: 'A',
        updated_at: null,
      },
      {
        id: 'S2',
        type: 'knowledge',
        source: 'knowledge',
        knowledge_id: 'kb-1',
        knowledge_name: 'Knowledge base A',
        document_id: 'doc-1',
        document_name: 'Doc',
        chunk_id: 'chunk-2',
        content: 'B',
        updated_at: null,
      },
      {
        id: 'S3',
        type: 'knowledge',
        source: 'qa_knowledge',
        // Same id string is still a different system (QA KB).
        knowledge_id: 'kb-1',
        knowledge_name: 'QA knowledge base',
        qa_id: 'qa-1',
        question: 'Q?',
        content: 'A',
        updated_at: null,
      },
    ]);

    expect(groups).toEqual([
      {
        knowledgeId: 'kb-1',
        knowledgeName: 'Knowledge base A',
        source: 'knowledge',
        fragmentCount: 2,
        sources: expect.any(Array),
      },
      {
        knowledgeId: 'kb-1',
        knowledgeName: 'QA knowledge base',
        source: 'qa_knowledge',
        fragmentCount: 1,
        sources: expect.any(Array),
      },
    ]);
    expect(groups[0].sources).toHaveLength(2);
  });

  it('groups citation sources by type in display order', () => {
    const groups = groupCitationSourcesByType([
      {
        id: 'S2',
        type: 'knowledge',
        source: 'knowledge',
        knowledge_id: 'kb-1',
        knowledge_name: 'KB',
        document_id: 'doc-1',
        document_name: 'Doc',
        chunk_id: 'chunk-1',
        content: 'Knowledge',
        updated_at: null,
      },
      {
        id: 'S4',
        type: 'memory',
        memory_id: 'memory-1',
        source_name: 'Memory',
        content: 'Memory',
      },
      {
        id: 'S5',
        type: 'web',
        title: 'Web A',
        url: 'https://example.com/a',
        snippet: 'A',
      },
      {
        id: 'S6',
        type: 'web',
        title: 'Web B',
        url: 'https://example.com/b',
        snippet: 'B',
      },
      {
        id: 'S7',
        type: 'file',
        filename: 'report.pdf',
        key: 'files/report.pdf',
        url: 'https://example.com/report.pdf',
        size: 1024,
        content_type: 'application/pdf',
      },
    ]);

    expect(groups.map((group) => group.type)).toEqual(['web', 'knowledge', 'file', 'memory']);
    expect(groups[0].sources.map((source) => source.id)).toEqual(['S5', 'S6']);
  });

  it('formats backend citation timestamps without timezone shifts', () => {
    expect(formatCitationDate('2026-08-04T14:11:00+08:00')).toBe('2026/08/04');
    expect(formatCitationDate(null)).toBeUndefined();
  });
});

