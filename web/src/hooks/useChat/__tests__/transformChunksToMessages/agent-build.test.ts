import { describe, expect, it } from 'vitest';
import { transformChunksToMessages } from '../../transformChunksToMessages';
import { MessageChunk } from '@/sdk';

const chunks: MessageChunk[] = [
  {
    id: '1768185803389_d4gi',
    type: 'session_init',
    content: '讲个笑话',
    role: 'assistant',
    detail: {
      session_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405',
      title: '讲个笑话',
    },
    timestamp: 1768185803389,
    session_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405',
    task_id: null,
    trace_id: null,
    trace_base_url: null,
    field_name: null,
  },
  {
    id: '1768185803450_ksjk',
    type: 'node_start',
    content: '',
    role: 'assistant',
    detail: {
      node_id: 'start',
      started_at: 1768185803450,
      node_type: 'builtins.Start',
      node_label: 'Start',
    },
    timestamp: 1768185803450,
    session_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405',
    task_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405_803390',
    trace_id: 'b47b56c9575ff535c6f7b7d316313732',
    trace_base_url: null,
    field_name: null,
  },

  {
    id: '1768185803451_u0v4',
    type: 'node_end',
    content: '',
    role: 'assistant',
    detail: {
      node_id: 'start',
      completed_at: 1768185803451,
      node_type: 'builtins.Start',
      node_label: 'Start',
    },
    timestamp: 1768185803451,
    session_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405',
    task_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405_803390',
    trace_id: 'b47b56c9575ff535c6f7b7d316313732',
    trace_base_url: null,
    field_name: null,
  },

  {
    id: '1768185803451_f0w4',
    type: 'node_start',
    content: '',
    role: 'assistant',
    detail: {
      node_id: 'agent',
      started_at: 1768185803451,
      node_type: 'builtins.Agent',
      node_label: 'My agent',
    },
    timestamp: 1768185803451,
    session_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405',
    task_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405_803390',
    trace_id: 'b47b56c9575ff535c6f7b7d316313732',
    trace_base_url: null,
    field_name: null,
  },

  {
    id: '1768185804001_y1c8',
    type: 'finish_reason',
    content:
      "Error code: 401 - {'error': {'code': '', 'message': '[sk-nma***EEF] 该令牌额度已用尽 !token.UnlimitedQuota && token.RemainQuota = -23243 (request id: 20260112104323271352243TmOzTQbb)', 'type': 'new_api_error'}}",
    role: 'assistant',
    detail: {
      reason:
        "Error code: 401 - {'error': {'code': '', 'message': '[sk-nma***EEF] 该令牌额度已用尽 !token.UnlimitedQuota && token.RemainQuota = -23243 (request id: 20260112104323271352243TmOzTQbb)', 'type': 'new_api_error'}}",
      status: 'failed',
    },
    timestamp: 1768185804001,
    session_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405',
    task_id: 'ab_b5b7286a-242a-49a4-9e40-7dc217dfa405_803390',
    trace_id: null,
    trace_base_url: null,
    field_name: null,
  },
];

describe('agent build - node start end', () => {
  it('1', () => {
    const messages = transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[]);
    expect(messages).toEqual([
      {
        role: 'assistant',
        messages: [
          {
            ...chunks[0],
            isLast: true,
          },
        ],
      },
    ]);
  });
  it('2', () => {
    const messages = transformChunksToMessages(chunks.slice(0, 2) as MessageChunk[]);
    expect(messages).toEqual([
      {
        role: 'assistant',
        trace_id: 'b47b56c9575ff535c6f7b7d316313732',
        messages: [
          {
            ...chunks[0],
            isLast: true,
          },
          {
            ...chunks[1],
            isLast: true,
          },
        ],
      },
    ]);
  });
  it('2', () => {
    const messages = transformChunksToMessages(chunks.slice(0, 3) as MessageChunk[]);
    expect(messages).toEqual([
      {
        role: 'assistant',
        trace_id: 'b47b56c9575ff535c6f7b7d316313732',
        messages: [
          {
            ...chunks[0],
            isLast: true,
          },
          {
            ...chunks[1],
            ...chunks[2],
            isLast: true,
          },
        ],
      },
    ]);
  });
});

describe('transformChunksToMessages', () => {
  it('1', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(0, 1), []);
    const onceMessages = transformChunksToMessages(chunks.slice(0, 1));

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('2', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(1, 2),
      transformChunksToMessages(chunks.slice(0, 1)),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 2));

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('3', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(2, 3),
      transformChunksToMessages(chunks.slice(0, 2)),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 3));

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('4', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(3, 4),
      transformChunksToMessages(chunks.slice(0, 3)),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 4));

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('5', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(4, 5),
      transformChunksToMessages(chunks.slice(0, 4)),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 5));

    expect(stepByStepMessages).toEqual(onceMessages);
  });
});
