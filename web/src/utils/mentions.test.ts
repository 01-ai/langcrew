import { describe, expect, it } from 'vitest';
import type { Mention } from '@/types';
import {
  buildMentionToken,
  contentAndMentionsToSlots,
  parseMentionToken,
  removeMentionFromInput,
  slotConfigToMentions,
  splitContentByMentions,
  syncMentionsWithContent,
} from '@/utils/mentions';

const SAMPLE_MENTIONS: Mention[] = [
  {
    token: '@session:123',
    type: 'session',
    id: '123',
    label: '登录问题对话',
  },
  {
    token: '@tool:mysql',
    type: 'tool',
    id: 'mysql',
    label: 'MySQL',
  },
  {
    token: '@tool:tool_code_search',
    type: 'tool',
    id: 'tool_code_search',
    label: '代码搜索',
  },
];

describe('mentions utils', () => {
  it('builds and parses mention tokens', () => {
    expect(buildMentionToken('session', '123')).toBe('@session:123');
    expect(parseMentionToken('@tool:mysql')).toEqual({ type: 'tool', id: 'mysql' });
    expect(parseMentionToken('@unknown:x')).toBeNull();
  });

  it('converts content + mentions into text/tag slots', () => {
    const content = '参考 @session:123 使用 @tool:mysql 和 @tool:tool_code_search';
    const slots = contentAndMentionsToSlots(content, SAMPLE_MENTIONS);

    expect(slots).toHaveLength(6);
    expect(slots[0]).toMatchObject({ type: 'text', value: '参考 ' });
    expect(slots[1]).toMatchObject({
      type: 'tag',
      props: { mentionLabel: '登录问题对话', value: '@session:123' },
    });
    expect(slots[2]).toMatchObject({ type: 'text', value: ' 使用 ' });
    expect(slots[3]).toMatchObject({
      type: 'tag',
      props: { mentionLabel: 'MySQL', value: '@tool:mysql' },
    });
    expect(slots[4]).toMatchObject({ type: 'text', value: ' 和 ' });
    expect(slots[5]).toMatchObject({
      type: 'tag',
      props: { mentionLabel: '代码搜索', value: '@tool:tool_code_search' },
    });
  });

  it('round-trips tag slots back to mentions', () => {
    const slots = contentAndMentionsToSlots(
      '参考 @session:123 使用 @tool:mysql',
      SAMPLE_MENTIONS.slice(0, 2),
    );
    expect(slotConfigToMentions(slots)).toEqual(SAMPLE_MENTIONS.slice(0, 2));
  });

  it('syncs mentions when tokens are removed from content', () => {
    expect(syncMentionsWithContent('只用 @tool:mysql', SAMPLE_MENTIONS)).toEqual([
      SAMPLE_MENTIONS[1],
    ]);
  });

  it('splits content for bubble rendering', () => {
    const parts = splitContentByMentions('参考 @session:123 结束', [SAMPLE_MENTIONS[0]]);
    expect(parts).toEqual([
      { type: 'text', text: '参考 ' },
      { type: 'mention', mention: SAMPLE_MENTIONS[0], text: '@session:123' },
      { type: 'text', text: ' 结束' },
    ]);
  });

  it('removes one mention occurrence from content and list', () => {
    const content = '参考 @session:123 使用 @tool:mysql';
    const next = removeMentionFromInput(content, SAMPLE_MENTIONS.slice(0, 2), SAMPLE_MENTIONS[0]);
    expect(next.content).toBe('参考 使用 @tool:mysql');
    expect(next.mentions).toEqual([SAMPLE_MENTIONS[1]]);
  });
});
