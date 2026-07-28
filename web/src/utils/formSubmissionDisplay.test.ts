import { describe, expect, it } from 'vitest';
import type { MessageItem } from '@/types';
import { formatJsonUserMessageWithNearestForm, type Translate } from './formSubmissionDisplay';

const t: Translate = (key, options) => {
  const translations: Record<string, string> = {
    'form.switch.yes': 'Yes.',
    'form.switch.no': 'No',
    'user_input.form.submitted.title': '{{title}} submitted',
    'user_input.form.submitted.default_title': 'Form information submitted',
    'user_input.form.submitted.field_header': 'Fields',
    'user_input.form.submitted.value_header': 'Contents',
    'user_input.form.submitted.array_separator': ', ',
    'user_input.form.submitted.empty_value': '-',
  };

  let message = translations[key] || key;
  Object.entries(options || {}).forEach(([placeholder, value]) => {
    message = message.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value));
  });
  return message;
};

const messages: MessageItem[] = [
  {
    role: 'assistant',
    messages: [
      {
        id: 'form',
        role: 'assistant',
        type: 'user_input',
        content: 'Please fill in your name, sex and month of birth.',
        timestamp: 100,
        detail: {
          interrupt_data: {
            type: 'user_input',
            question: 'Please fill in your name, sex and month of birth.',
            form_schema: {
              type: 'object',
              title: 'User Information Collection Table',
              properties: {
                name: {
                  type: 'string',
                  title: 'Name',
                },
                gender: {
                  type: 'string',
                  title: 'Gender',
                },
                interests: {
                  type: 'multiselect',
                  title: 'Interest',
                },
                accepted: {
                  type: 'boolean',
                  title: 'Agreed or not?',
                },
              },
            },
          },
        },
      },
    ],
  },
  {
    role: 'user',
    messages: [
      {
        id: 'answer',
        role: 'user',
        type: 'text',
        content: '{"name":"111","gender":"Men","interests":["Reading","Sports"],"accepted":true}',
        timestamp: 200,
      },
    ],
  },
];

describe('formatJsonUserMessageWithNearestForm', () => {
  it('formats pure JSON as a markdown table with the nearest form schema', () => {
    const currentMessage = messages[1].messages[0];

    expect(formatJsonUserMessageWithNearestForm(currentMessage.content, messages, currentMessage, 1, t)).toBe(
      [
        'User Information Collection Table submitted',
        '',
        '| Fields | Contents |',
        '| --- | --- |',
        '| Name | 111 |',
        '| Gender | Men |',
        '| Interest | Reading, Sports |',
        '| Agreed or not? | Yes. |',
      ].join('\n'),
    );
  });

  it('keeps non-JSON content unchanged', () => {
    const content = 'Normal Text';

    expect(
      formatJsonUserMessageWithNearestForm(
        content,
        messages,
        {
          role: 'user',
          type: 'text',
          content,
        },
        1,
        t,
      ),
    ).toBe(content);
  });

  it('keeps JSON content unchanged when no form schema is nearby', () => {
    const content = '{"debug":true}';

    expect(
      formatJsonUserMessageWithNearestForm(
        content,
        [
          {
            role: 'user',
            messages: [
              {
                role: 'user',
                type: 'text',
                content,
              },
            ],
          },
        ],
        {
          role: 'user',
          type: 'text',
          content,
        },
        0,
        t,
      ),
    ).toBe(content);
  });

  it('keeps JSON content unchanged when keys do not match the nearest form schema', () => {
    const currentMessage = {
      role: 'user' as const,
      type: 'text',
      content: '{"debug":true}',
      timestamp: 200,
    };

    expect(formatJsonUserMessageWithNearestForm(currentMessage.content, messages, currentMessage, 1, t)).toBe(
      currentMessage.content,
    );
  });

  it('escapes markdown table separators and preserves line breaks in cells', () => {
    const currentMessage = {
      role: 'user' as const,
      type: 'text',
      content: '{"name":"a|b\\nc"}',
      timestamp: 200,
    };

    expect(formatJsonUserMessageWithNearestForm(currentMessage.content, messages, currentMessage, 1, t)).toContain(
      '| Name | a\\|b<br />c |',
    );
  });
});
