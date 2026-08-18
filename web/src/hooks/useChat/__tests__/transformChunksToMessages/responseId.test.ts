import { describe, expect, it } from 'vitest';
import type { MessageChunk } from '@/types';
import { transformChunksToMessages } from '../../transformChunksToMessages';

const textChunk = (overrides: Partial<MessageChunk> = {}): MessageChunk => ({
  id: 'text-1',
  role: 'assistant',
  type: 'text',
  content: 'Hello',
  ...overrides,
});

describe('transformChunksToMessages response_id', () => {
  it('writes a shared responseId onto the assistant message', () => {
    const messages = transformChunksToMessages([
      textChunk({ id: '1', response_id: 'resp-a', content: 'A' }),
      textChunk({ id: '2', response_id: 'resp-a', content: 'B' }),
      { id: '3', role: 'assistant', type: 'finish_reason', content: '', response_id: 'resp-a' },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('assistant');
    expect(messages[0].responseId).toBe('resp-a');
    expect(messages[0].messages.map((chunk) => chunk.id)).toEqual(['1', '2', '3']);
  });

  it('starts a new assistant message when response_id changes', () => {
    const messages = transformChunksToMessages([
      textChunk({ id: '1', response_id: 'resp-a', content: 'First' }),
      { id: '2', role: 'assistant', type: 'finish_reason', content: '', response_id: 'resp-a' },
      textChunk({ id: '3', response_id: 'resp-b', content: 'Second' }),
      { id: '4', role: 'assistant', type: 'finish_reason', content: '', response_id: 'resp-b' },
    ]);

    const assistantMessages = messages.filter((message) => message.role === 'assistant');
    expect(assistantMessages).toHaveLength(2);
    expect(assistantMessages[0].responseId).toBe('resp-a');
    expect(assistantMessages[1].responseId).toBe('resp-b');
    expect(assistantMessages[0].messages.map((chunk) => chunk.id)).toEqual(['1', '2']);
    expect(assistantMessages[1].messages.map((chunk) => chunk.id)).toEqual(['3', '4']);
  });

  it('does not set responseId when chunks have no response_id', () => {
    const messages = transformChunksToMessages([
      textChunk({ id: '1', content: 'Legacy' }),
      { id: '2', role: 'assistant', type: 'finish_reason', content: '' },
    ]);

    expect(messages[0].responseId).toBeUndefined();
  });

  it('dedupes replayed chunks with the same id', () => {
    const messages = transformChunksToMessages([
      textChunk({ id: 'same', response_id: 'resp-a', content: 'Hello' }),
      textChunk({ id: 'same', response_id: 'resp-a', content: 'Hello' }),
      { id: 'finish', role: 'assistant', type: 'finish_reason', content: '', response_id: 'resp-a' },
    ]);

    expect(messages[0].messages.filter((chunk) => chunk.type === 'text')).toHaveLength(1);
    expect(messages[0].messages.find((chunk) => chunk.type === 'text')?.content).toBe('Hello');
  });
});
