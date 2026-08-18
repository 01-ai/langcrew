import { describe, expect, it } from 'vitest';
import { resolveMessageMetadata } from './messageMetadata';

describe('resolveMessageMetadata', () => {
  it('returns top-level metadata when present', () => {
    const metadata = {
      reference: {
        id: 'todo-1',
        title: '顶层引用',
      },
    };

    expect(
      resolveMessageMetadata({
        metadata,
        detail: {
          reference: {
            id: 'detail-reference',
            title: 'detail 引用',
          },
        },
      }),
    ).toEqual(metadata);
  });

  it('returns detail.metadata when top-level metadata is absent', () => {
    const metadata = {
      reference: {
        id: 'todo-1',
        title: 'detail metadata 引用',
      },
    };

    expect(
      resolveMessageMetadata({
        detail: {
          metadata,
        },
      }),
    ).toEqual(metadata);
  });

  it('wraps detail.reference as metadata.reference', () => {
    const reference = {
      key: 'checklist:initial_contact:not_ready',
      title: '完善 7 项方案所需信息',
      description: '项目干系人、项目目标与预算',
    };

    expect(
      resolveMessageMetadata({
        detail: {
          reference,
        },
      }),
    ).toEqual({
      reference,
    });
  });

  it('merges detail.reference into metadata without reference', () => {
    const reference = {
      key: 'checklist:initial_contact:not_ready',
      title: '完善 7 项方案所需信息',
    };

    expect(
      resolveMessageMetadata({
        metadata: {
          ticket: {
            id: 'ticket-1',
          },
        },
        detail: {
          reference,
        },
      }),
    ).toEqual({
      ticket: {
        id: 'ticket-1',
      },
      reference,
    });
  });
});
