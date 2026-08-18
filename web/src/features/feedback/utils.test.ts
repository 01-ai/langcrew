import { describe, expect, it } from 'vitest';
import { AgentMode, type MessageItem } from '@/types';
import { shouldShowFeedback } from './utils';

const baseOptions = {
  enableFeedback: true,
  mode: AgentMode.Chatbot,
  hasUserInput: false,
};

const assistantMessage = (overrides: Partial<MessageItem> = {}): MessageItem => ({
  role: 'assistant',
  responseId: 'resp-1',
  messages: [{ id: '1', role: 'assistant', type: 'text', content: 'Hello' }],
  ...overrides,
});

describe('shouldShowFeedback', () => {
  it('hides buttons until finish_reason arrives', () => {
    expect(shouldShowFeedback(assistantMessage(), baseOptions)).toBe(false);
  });

  it('shows buttons after finish_reason when the turn has visible output', () => {
    expect(
      shouldShowFeedback(
        assistantMessage({
          messages: [
            { id: '1', role: 'assistant', type: 'text', content: 'Hello' },
            { id: '2', role: 'assistant', type: 'finish_reason', content: '' },
          ],
        }),
        baseOptions,
      ),
    ).toBe(true);
  });

  it('hides buttons when finish_reason is waiting for user input', () => {
    expect(
      shouldShowFeedback(
        assistantMessage({
          messages: [
            { id: '1', role: 'assistant', type: 'text', content: 'Hello' },
            {
              id: '2',
              role: 'assistant',
              type: 'finish_reason',
              content: '',
              detail: { reason: 'user_input', status: 'user_input' },
            },
          ],
        }),
        baseOptions,
      ),
    ).toBe(false);
  });
});
