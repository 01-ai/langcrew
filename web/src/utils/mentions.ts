import type { ReactNode } from 'react';
import type { SlotConfigType } from '@ant-design/x/es/sender/interface';
import type { Mention, MentionType, SenderInputValue } from '@/types';

const MENTION_TOKEN_REGEXP = /@([a-z]+):([a-zA-Z0-9._-]+)/g;
const MENTION_TOKEN_EXACT_REGEXP = /^@([a-z]+):([a-zA-Z0-9._-]+)$/;

const SUPPORTED_MENTION_TYPES = new Set<MentionType>(['session', 'tool']);

let mentionKeySeed = 0;

const nextMentionSlotKey = (type: string, id: string) => {
  mentionKeySeed += 1;
  return `mention:${type}:${id}:${mentionKeySeed}:${Date.now()}`;
};

type MentionTagProps = {
  label: ReactNode;
  value?: string;
  /** Plain-text label kept for slotConfig → Mention round-trip. */
  mentionLabel?: string;
};

type MentionTagSlot = Extract<SlotConfigType, { type: 'tag' }>;

export const buildMentionToken = (type: MentionType, id: string): string => `@${type}:${id}`;

export const parseMentionToken = (
  token: string,
): { type: MentionType; id: string } | null => {
  const match = MENTION_TOKEN_EXACT_REGEXP.exec(token);
  if (!match) return null;

  const type = match[1] as MentionType;
  if (!SUPPORTED_MENTION_TYPES.has(type)) return null;

  return { type, id: match[2] };
};

export const normalizeSenderInputValue = (value: string | SenderInputValue): SenderInputValue => {
  if (typeof value === 'string') {
    return { content: value, mentions: [] };
  }

  return {
    content: value.content ?? '',
    mentions: value.mentions ?? [],
  };
};

export const mentionToTagSlot = (mention: Mention, labelNode?: ReactNode): SlotConfigType => {
  const token = mention.token || buildMentionToken(mention.type, mention.id);
  const plainLabel = mention.label || token;
  const props: MentionTagProps = {
    label: labelNode ?? plainLabel,
    value: token,
    mentionLabel: plainLabel,
  };

  return {
    type: 'tag',
    key: nextMentionSlotKey(mention.type, mention.id),
    props,
    formatResult: () => token,
  };
};

const resolveMentionLabel = (slot: MentionTagSlot, token: string): string => {
  const props = (slot.props || {}) as MentionTagProps;
  if (typeof props.mentionLabel === 'string' && props.mentionLabel) {
    return props.mentionLabel;
  }
  if (typeof props.label === 'string' || typeof props.label === 'number') {
    return String(props.label);
  }
  return token;
};

export const slotConfigToMentions = (slotConfig: SlotConfigType[] = []): Mention[] => {
  const mentions: Mention[] = [];

  slotConfig.forEach((slot) => {
    if (slot.type !== 'tag') return;

    const token = String(slot.props?.value ?? (slot as { value?: string }).value ?? '');
    const parsed = parseMentionToken(token);
    if (!parsed) return;

    mentions.push({
      token,
      type: parsed.type,
      id: parsed.id,
      label: resolveMentionLabel(slot, token),
    });
  });

  return mentions;
};

/**
 * Keep mentions whose tokens still appear in content (order preserved, first-match wins).
 */
export const syncMentionsWithContent = (content: string, mentions: Mention[] = []): Mention[] => {
  if (!mentions.length) return [];

  const remaining = [...mentions];
  const synced: Mention[] = [];
  const tokenRegexp = new RegExp(MENTION_TOKEN_REGEXP.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = tokenRegexp.exec(content)) !== null) {
    const token = match[0];
    const index = remaining.findIndex((item) => item.token === token);
    if (index === -1) continue;
    synced.push(remaining[index]);
    remaining.splice(index, 1);
  }

  return synced;
};

/**
 * Split `content` into text + tag slots using mention tokens for setInput / insert.
 */
export const contentAndMentionsToSlots = (
  content: string,
  mentions: Mention[] = [],
  options?: {
    renderLabel?: (mention: Mention) => ReactNode;
  },
): SlotConfigType[] => {
  if (!content) return [];

  const mentionByToken = new Map<string, Mention[]>();
  mentions.forEach((mention) => {
    const list = mentionByToken.get(mention.token) ?? [];
    list.push(mention);
    mentionByToken.set(mention.token, list);
  });

  const slots: SlotConfigType[] = [];
  const tokenRegexp = new RegExp(MENTION_TOKEN_REGEXP.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegexp.exec(content)) !== null) {
    const token = match[0];
    const start = match.index;

    if (start > lastIndex) {
      slots.push({ type: 'text', value: content.slice(lastIndex, start) });
    }

    const queue = mentionByToken.get(token);
    const mention = queue?.shift();
    if (mention) {
      slots.push(mentionToTagSlot(mention, options?.renderLabel?.(mention)));
    } else {
      const parsed = parseMentionToken(token);
      if (parsed) {
        const fallbackMention: Mention = {
          token,
          type: parsed.type,
          id: parsed.id,
          label: token,
        };
        slots.push(mentionToTagSlot(fallbackMention, options?.renderLabel?.(fallbackMention)));
      } else {
        slots.push({ type: 'text', value: token });
      }
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < content.length) {
    slots.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return slots;
};

export type MentionContentPart =
  | { type: 'text'; text: string }
  | { type: 'mention'; mention: Mention; text: string };

/**
 * Split message content into plain text and mention parts for bubble rendering.
 */
export const splitContentByMentions = (
  content: string,
  mentions: Mention[] = [],
): MentionContentPart[] => {
  if (!content) return [];
  if (!mentions.length) return [{ type: 'text', text: content }];

  const mentionByToken = new Map<string, Mention[]>();
  mentions.forEach((mention) => {
    const list = mentionByToken.get(mention.token) ?? [];
    list.push(mention);
    mentionByToken.set(mention.token, list);
  });

  const parts: MentionContentPart[] = [];
  const tokenRegexp = new RegExp(MENTION_TOKEN_REGEXP.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegexp.exec(content)) !== null) {
    const token = match[0];
    const start = match.index;

    if (start > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, start) });
    }

    const queue = mentionByToken.get(token);
    const mention = queue?.shift();
    if (mention) {
      parts.push({ type: 'mention', mention, text: token });
    } else {
      parts.push({ type: 'text', text: token });
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return parts;
};

/**
 * Remove one occurrence of a mention token from composer content + mentions list.
 */
export const removeMentionFromInput = (
  content: string,
  mentions: Mention[],
  target: Mention,
): SenderInputValue => {
  const idx = content.indexOf(target.token);
  let nextContent = content;
  if (idx >= 0) {
    nextContent = `${content.slice(0, idx)}${content.slice(idx + target.token.length)}`.replace(/[ \t]{2,}/g, ' ');
  }

  let removed = false;
  const nextMentions = mentions.filter((item) => {
    if (!removed && item.token === target.token && item.id === target.id) {
      removed = true;
      return false;
    }
    return true;
  });

  return {
    content: nextContent,
    mentions: nextMentions,
  };
};
