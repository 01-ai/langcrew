import React, { useEffect } from 'react';
import Agent from '@/components/Agent';
import Home from '@/components/Home';
import { useAgentStore } from '@/store';
import '@/registry/builtin';
import './index.css';
import { App as AntApp } from 'antd';

const AgentX = ({ requestPrefix }: { requestPrefix?: string }) => {
  const { sessionInfo } = useAgentStore();

  useEffect(() => {
    if (requestPrefix) {
      useAgentStore.setState({ requestPrefix });
    }
  }, [requestPrefix]);

  return (
    <AntApp>
      <div className={`w-full h-screen`}>{sessionInfo ? <Agent /> : <Home />}</div>
    </AntApp>
  );
};

export default AgentX;
