import { describe, expect, it } from 'vitest';
import type { MessageItem } from '@/types';
import { formatJsonUserMessageWithNearestForm, type Translate } from './formSubmissionDisplay';

const t: Translate = (key, options) => {
  const translations: Record<string, string> = {
    'form.switch.yes': '是',
    'form.switch.no': '否',
    'user_input.form.submitted.title': '已提交{{title}}',
    'user_input.form.submitted.default_title': '已提交表单信息',
    'user_input.form.submitted.field_header': '字段',
    'user_input.form.submitted.value_header': '内容',
    'user_input.form.submitted.array_separator': '、',
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
        content: '请填写姓名、性别和出生年月。',
        timestamp: 100,
        detail: {
          interrupt_data: {
            type: 'user_input',
            question: '请填写姓名、性别和出生年月。',
            form_schema: {
              type: 'object',
              title: '用户信息收集表',
              properties: {
                name: {
                  type: 'string',
                  title: '姓名',
                },
                gender: {
                  type: 'string',
                  title: '性别',
                },
                interests: {
                  type: 'multiselect',
                  title: '兴趣',
                },
                accepted: {
                  type: 'boolean',
                  title: '是否同意',
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
        content: '{"name":"111","gender":"男","interests":["阅读","运动"],"accepted":true}',
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
        '已提交用户信息收集表',
        '',
        '| 字段 | 内容 |',
        '| --- | --- |',
        '| 姓名 | 111 |',
        '| 性别 | 男 |',
        '| 兴趣 | 阅读、运动 |',
        '| 是否同意 | 是 |',
      ].join('\n'),
    );
  });

  it('keeps non-JSON content unchanged', () => {
    const content = '普通文本';

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
      '| 姓名 | a\\|b<br />c |',
    );
  });
});
