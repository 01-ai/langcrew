import React from 'react';
import type { Mention } from '@/types';
import CloseSvg from '@/assets/svg/citations/close.svg?react';
import ToolMentionIconSvg from '@/assets/svg/mentions/icon.svg?react';
import SessionMentionIconSvg from '@/assets/svg/mentions/session.svg?react';
import './MentionLabel.less';

interface MentionLabelProps {
  mention: Mention;
  className?: string;
  /** When true, hover swaps leading icon to close; click triggers onRemove. */
  removable?: boolean;
  onRemove?: (event: React.MouseEvent) => void;
}

const MentionTypeIcon: React.FC<{ type: Mention['type']; className?: string }> = ({ type, className }) =>
  type === 'session' ? (
    <SessionMentionIconSvg className={className} aria-hidden />
  ) : (
    <ToolMentionIconSvg className={className} aria-hidden />
  );

const MentionLabel: React.FC<MentionLabelProps> = ({ mention, className, removable, onRemove }) => {
  const iconClassName = 'mention-label__icon mention-label__icon--default';

  return (
    <span
      className={['mention-label', removable ? 'mention-label--removable' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {removable ? (
        <button
          type="button"
          className="mention-label__icon-btn"
          aria-label="Remove mention"
          // contenteditable: preventDefault on mousedown suppresses the following click.
          // Remove must therefore run on mousedown.
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove?.(event);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <MentionTypeIcon type={mention.type} className={iconClassName} />
          <CloseSvg className="mention-label__icon mention-label__icon--close" aria-hidden />
        </button>
      ) : (
        <MentionTypeIcon type={mention.type} className={iconClassName} />
      )}
      <span className="mention-label__text">{mention.label || mention.token}</span>
    </span>
  );
};

export default MentionLabel;
