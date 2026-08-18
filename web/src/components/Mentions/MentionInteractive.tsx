import React, { useCallback } from 'react';
import { Tooltip } from 'antd';
import { useStore } from 'zustand';
import type { Mention, MentionRenderVariant } from '@/types';
import { useAgentStoreApi } from '@/store';
import eventBus from '@/utils/eventBus';
import MentionLabel from './MentionLabel';
import './MentionInteractive.less';

interface MentionInteractiveProps {
  mention: Mention;
  variant: MentionRenderVariant;
  className?: string;
}

const isRemoveButtonTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('.mention-label__icon-btn'));

/**
 * Renders a mention chip with optional host-configured tooltip / click.
 * - draft (composer): tooltip + onClick + hover remove
 * - message (bubble): tooltip + onClick only (no remove)
 *
 * NOTE: Prefer `useStore(storeApi, selector)` over `useAgentStore(selector)` here.
 * `useAgentStore` spreads the selector result and attaches getState/setState, which
 * corrupts primitive values (e.g. instanceId string → object) and can infinite-loop
 * when the selector returns a fresh object each call.
 */
const MentionInteractive: React.FC<MentionInteractiveProps> = ({ mention, variant, className }) => {
  const storeApi = useAgentStoreApi();
  const mentionConfig = useStore(storeApi, (s) => s.mentionConfig);
  const instanceId = useStore(storeApi, (s) => s.instanceId);
  const tooltip = mentionConfig?.getTooltip?.({ mention, variant });
  const clickable = typeof mentionConfig?.onClick === 'function';
  const removable = variant === 'draft';
  const isDraft = variant === 'draft';

  const handleRemove = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      eventBus.emit(`remove_sender_mention_${instanceId}`, mention);
    },
    [instanceId, mention],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!mentionConfig?.onClick) return;
      if (isRemoveButtonTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      mentionConfig.onClick({ mention, variant, event });
    },
    [mention, mentionConfig, variant],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      // Only needed in composer contenteditable to avoid caret jumps.
      if (!isDraft) return;
      if (isRemoveButtonTarget(event.target)) return;
      if (!clickable && !removable) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [clickable, isDraft, removable],
  );

  const node = (
    <span
      className={[
        'mention-interactive',
        clickable ? 'mention-interactive--clickable' : '',
        removable ? 'mention-interactive--removable' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-mention-type={mention.type}
      data-mention-id={mention.id}
      data-mention-variant={variant}
      onClick={clickable ? handleClick : undefined}
      onMouseDown={isDraft && (clickable || removable) ? handleMouseDown : undefined}
      role={clickable ? 'link' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                mentionConfig?.onClick?.({
                  mention,
                  variant,
                  event: event as unknown as React.MouseEvent,
                });
              }
            }
          : undefined
      }
    >
      <MentionLabel mention={mention} removable={removable} onRemove={handleRemove} />
    </span>
  );

  if (tooltip == null || tooltip === false || tooltip === '') {
    return node;
  }

  return (
    <Tooltip title={tooltip} mouseEnterDelay={0.2}>
      {node}
    </Tooltip>
  );
};

export default MentionInteractive;
