import type { FormSchema, MessageChunk, MessageItem } from '@/types';

export type Translate = (key: string, options?: Record<string, string | number | boolean>) => string;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseJsonObject = (content: string): Record<string, unknown> | null => {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getFormSchema = (message: MessageChunk): FormSchema | undefined => {
  if (message.type !== 'user_input') return undefined;
  return message.detail?.interrupt_data?.form_schema;
};

const findNearestFormSchemaByTimestamp = (
  messages: MessageItem[],
  currentTimestamp?: number,
): FormSchema | undefined => {
  if (currentTimestamp === undefined) return undefined;

  let nearest: { schema: FormSchema; distance: number } | undefined;

  messages.forEach((item) => {
    if (item.role !== 'assistant') return;

    item.messages.forEach((message) => {
      const schema = getFormSchema(message);
      if (!schema || message.timestamp === undefined || message.timestamp >= currentTimestamp) return;

      const distance = currentTimestamp - message.timestamp;
      if (!nearest || distance < nearest.distance) {
        nearest = { schema, distance };
      }
    });
  });

  return nearest?.schema;
};

const findNearestPreviousFormSchema = (
  messages: MessageItem[],
  currentMessageIndex: number,
): FormSchema | undefined => {
  for (let i = currentMessageIndex - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (item.role !== 'assistant') continue;

    const userInput = item.messages
      .slice()
      .reverse()
      .find((message) => getFormSchema(message));

    const schema = userInput ? getFormSchema(userInput) : undefined;
    if (schema) return schema;
  }

  return undefined;
};

const formatSubmittedFormValue = (value: unknown, t: Translate): string => {
  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => formatSubmittedFormValue(item, t)).join(t('user_input.form.submitted.array_separator'))
      : t('user_input.form.submitted.empty_value');
  }

  if (value === null || value === undefined || value === '') {
    return t('user_input.form.submitted.empty_value');
  }

  if (typeof value === 'boolean') {
    return value ? t('form.switch.yes') : t('form.switch.no');
  }

  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }

  return String(value);
};

const escapeMarkdownTableCell = (value: string): string => {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br />');
};

export const formatJsonUserMessageWithNearestForm = (
  content: string,
  messages: MessageItem[],
  currentMessage: MessageChunk,
  currentMessageIndex: number,
  t: Translate,
) => {
  const data = parseJsonObject(content);
  if (!data) return content;

  const schema =
    findNearestFormSchemaByTimestamp(messages, currentMessage.timestamp) ||
    findNearestPreviousFormSchema(messages, currentMessageIndex);
  if (!schema) return content;

  const entries = Object.entries(data);
  if (!entries.length) return content;
  if (!entries.some(([key]) => schema.properties?.[key])) return content;

  const title = schema.title
    ? t('user_input.form.submitted.title', { title: schema.title })
    : t('user_input.form.submitted.default_title');
  const fieldHeader = escapeMarkdownTableCell(t('user_input.form.submitted.field_header'));
  const valueHeader = escapeMarkdownTableCell(t('user_input.form.submitted.value_header'));
  const rows = entries.map(([key, value]) => {
    const label = schema.properties?.[key]?.title || key;
    return `| ${escapeMarkdownTableCell(label)} | ${escapeMarkdownTableCell(formatSubmittedFormValue(value, t))} |`;
  });

  return [title, '', `| ${fieldHeader} | ${valueHeader} |`, '| --- | --- |', ...rows].join('\n');
};
