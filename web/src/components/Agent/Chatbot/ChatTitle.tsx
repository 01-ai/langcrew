import React, { type CSSProperties } from 'react';
import classNames from 'classnames';
import { useAgentStore, useAgentStoreApi } from '@/store';

export interface ChatTitleProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * ChatTitle Component - Show Session Title
 */
export function ChatTitle({ className, style }: ChatTitleProps) {
  const store = useAgentStore();
  const sessionTitle = store.sessionInfo?.title;

  return (
    <div
      className={classNames('justify-center text-black text-base font-semibold leading-5 truncate', className)}
      style={style}
    >
      {sessionTitle}
    </div>
  );
}

export default ChatTitle;
