import React, { FC, ReactNode, useCallback, useMemo } from 'react';
import { useAgentStore, useAgentStoreApi } from '@/store';
import { HeaderNode } from '@/types';
import ChatTitle from './Chatbot/ChatTitle';
import ChatFiles from './Chatbot/ChatFiles';
import NewChat from '@/assets/svg/sender/new-chat.svg?react';

type AgentHeaderProps = {
  headerNode?: HeaderNode;
  backButtonNode?: ReactNode;
  shareButtonNode?: ReactNode;
};

const AgentHeader: FC<AgentHeaderProps> = ({ headerNode, backButtonNode, shareButtonNode }) => {
  // Hooks must run unconditionally at the top
  const { layoutConfig, sessionInfo } = useAgentStore();
  const storeApi = useAgentStoreApi();

  // Keep remaining logic after hooks
  const newChat = useCallback(() => {
    storeApi.getState().resetStore();
  }, [storeApi]);

  // Memoize headerNode so its identity stays stable
  const customHeader = useMemo(() => {
    if (typeof headerNode === 'function') {
      return headerNode({
        ChatTitle,
        ChatFiles,
        newChat,
        sessionInfo,
      });
    }
    return headerNode || null;
  }, [headerNode, sessionInfo, newChat]);

  // Return a custom header when provided
  if (customHeader) {
    return <>{customHeader}</>;
  }

  // Hide in embedded/narrow mode when there is no session
  if (layoutConfig.narrowMode && !sessionInfo?.session_id) {
    return null;
  }

  // Render the default header
  return (
    <div className="h-[52px] bg-[#FCFCFC] !p-0 border-b border-solid border-[#EAEAEA] px-5">
      <div className="h-full grid grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] gap-4 items-center">
        <div className="flex justify-start items-center">{backButtonNode ? backButtonNode : null}</div>
        <div />
        <div className="flex justify-end items-center [&_.ant-btn-icon-only]:!w-[40px]">
          {shareButtonNode ? shareButtonNode : null}
          {layoutConfig.narrowMode && sessionInfo?.session_id && (
            <div
              className="w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-[#F6F6F8] rounded-sm"
              onClick={newChat}
            >
              <NewChat />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentHeader;
