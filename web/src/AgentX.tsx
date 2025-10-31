import React, { useEffect } from 'react';
import Agent from '@/components/Agent';
import Home from '@/components/Home';
import { useAgentStore } from '@/store';
import '@/registry/builtin';
import './index.css';
import { App as AntApp } from 'antd';
import { FileUploadConfig, MessageChunk, MessageItem } from '@/types';

interface AgentXProps {
  requestPrefix?: string;
  fileUploadConfig?: FileUploadConfig;
  onChunks?: (chunks: MessageChunk[]) => void;
  onNewMessage?: (message: MessageItem) => void;
  onToolsUpdate?: (tools: any[]) => void;
}

const AgentX = (props: AgentXProps) => {
  const { requestPrefix, onToolsUpdate, fileUploadConfig, onChunks, onNewMessage } = props;
  const { sessionInfo } = useAgentStore();

  useEffect(() => {
    if (requestPrefix) {
      useAgentStore.setState({ requestPrefix });
    }
  }, [requestPrefix]);

  useEffect(() => {
    if (onToolsUpdate) {
      useAgentStore.setState({ onToolsUpdate });
    }
  }, [onToolsUpdate]);

  useEffect(() => {
    if (onChunks) {
      useAgentStore.setState({ onChunks });
    }
  }, [onChunks]);

  useEffect(() => {
    if (onNewMessage) {
      useAgentStore.setState({ onNewMessage });
    }
  }, [onNewMessage]);

  useEffect(() => {
    if (fileUploadConfig) {
      useAgentStore.setState({
        fileUploadConfig,
      });
    }
  }, [fileUploadConfig]);

  return (
    <AntApp>
      <div className={`w-full h-screen`}>{sessionInfo ? <Agent /> : <Home />}</div>
    </AntApp>
  );
};

export default AgentX;
