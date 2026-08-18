import React from 'react';
import { useAgentStore } from '@/store';
import ChatSender from './ChatSender';
import ReplaySender from './ReplaySender';
import { AgentMode } from '@/types';
import './index.less';

const SenderContainer: React.FC<{
  basePath?: string;
  agentId?: string;
  sessionId?: string;
  menuItems?: {
    key: string;
    label: string;
    icon?: React.ReactNode;
  }[];
  showSenderActions?: boolean;
  topAddon?: React.ReactNode;
}> = ({ basePath, agentId, sessionId, menuItems, showSenderActions = false, topAddon }) => {
  const { mode } = useAgentStore();

  if (mode === AgentMode.Chatbot) {
    return (
      <ChatSender
        basePath={basePath}
        agentId={agentId}
        sessionId={sessionId}
        menuItems={menuItems}
        showSenderActions={showSenderActions}
        topAddon={topAddon}
      />
    );
  } else {
    return <ReplaySender />;
  }
};

export default SenderContainer;
