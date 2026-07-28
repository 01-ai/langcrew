import { describe, expect, it } from 'vitest';
import { resolveMessageMetadata } from './messageMetadata';

describe('resolveMessageMetadata', () => {
  it('returns top-level metadata when present', () => {
    const metadata = {
      reference: {
        id: 'todo-1',
        title: 'Top Level Reference',
      },
    };

    expect(
      resolveMessageMetadata({
        metadata,
        detail: {
          reference: {
            id: 'detail-reference',
            title: 'detail References',
          },
        },
      }),
    ).toEqual(metadata);
  });

  it('returns detail.metadata when top-level metadata is absent', () => {
    const metadata = {
      reference: {
        id: 'todo-1',
        title: 'detail metadata References',
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
      title: 'Complete the seven required fields',
      description: 'Project managers, project objectives and budget',
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
      title: 'Complete the seven required fields',
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
