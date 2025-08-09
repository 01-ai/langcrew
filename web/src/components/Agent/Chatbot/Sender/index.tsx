import React from 'react';
import { useAgentStore } from '@/store';
import ChatSender from './ChatSender';
import ReplaySender from './ReplaySender';
import { AgentMode } from '@/types';
import './index.less';

const SenderContainer: React.FC = () => {
  const { mode } = useAgentStore();

  if (mode === AgentMode.Chatbot) {
    return <ChatSender />;
  } else {
    return <ReplaySender />;
  }
};

export default SenderContainer;
