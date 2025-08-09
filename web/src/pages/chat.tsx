import React, { useEffect, useState } from 'react';
import Agent from '@/components/Agent';
import Home from '@/components/Home';
import { useAgentStore } from '@/store';
import { KnowledgeBaseItem, MCPToolItem, AgentMode } from '@/types';
import { EmployeeType } from '@/components/Home/mock';
import '@/registry/builtin';
import { senderMCPTools, senderKnowledgeBases, senderSandboxTools } from './mock';

interface AgentProps {
  basePath?: string;
  headerNode?: React.ReactNode;
  footerNode?: React.ReactNode;
  knowledgeBases?: KnowledgeBaseItem[];
  mcpTools?: MCPToolItem[];
  // 额外请求头
  extraHeaders?: Record<string, string>;
  // 请求前缀，万智传/app
  requestPrefix?: string;
}

const Chat = (props: AgentProps) => {
  const [currentAgent, setCurrentAgent] = useState<EmployeeType | null>(null);
  const { basePath = '/chat', headerNode, footerNode, knowledgeBases, mcpTools, extraHeaders, requestPrefix } = props;

  const idInfo = {};
  const relativePath = location.pathname.replace(basePath, '');
  if (relativePath.startsWith('/share')) {
    idInfo['shareId'] = relativePath.replace('/share/', '');
    idInfo['sharePassword'] = new URLSearchParams(location.search).get('password') || '';
  } else {
    const ids = relativePath.split('/').filter((item) => Boolean(item));
    idInfo['agentId'] = ids[0] || '01';
    idInfo['sessionId'] = ids[1];
  }

  const {
    sessionId,
    shareId,
    setBasePath,
    setAgentId,
    setSessionId,
    setShareId,
    setSharePassword,
    setMode,
    setSenderKnowledgeBases,
    setSelectedSenderKnowledgeBases,
    setSenderMCPTools,
    setSenderSandboxTools,
    setSelectedSenderMCPTools,
    setExtraHeaders,
    setRequestPrefix,
  } = useAgentStore();

  useEffect(() => {
    if (basePath !== useAgentStore.getState().basePath) {
      setBasePath(basePath);
    }
    if (idInfo['agentId'] !== useAgentStore.getState().agentId) {
      setAgentId(idInfo['agentId']);
    }
    if (idInfo['sessionId'] !== useAgentStore.getState().sessionId) {
      setSessionId(idInfo['sessionId']);
    }
  }, [basePath, idInfo, setAgentId, setBasePath, setSessionId]);

  useEffect(() => {
    if (idInfo['shareId']) {
      setShareId(idInfo['shareId']);
      setSharePassword(idInfo['sharePassword']);
      setMode(AgentMode.Replay);
    } else {
      setMode(AgentMode.Chatbot);
    }

    setSenderKnowledgeBases(senderKnowledgeBases);
    if (senderKnowledgeBases?.length > 0) {
      setSelectedSenderKnowledgeBases([]);
    }
    setSenderMCPTools(senderMCPTools);
    setSenderSandboxTools(senderSandboxTools as MCPToolItem[]);
    if (senderSandboxTools?.length > 0) {
      setSelectedSenderMCPTools(senderSandboxTools.filter((item) => item.status === 'ACTIVE') as MCPToolItem[]);
    }
  }, []);

  useEffect(() => {
    setExtraHeaders(extraHeaders || {});
    setRequestPrefix(requestPrefix || '');
  }, [extraHeaders, setExtraHeaders, requestPrefix, setRequestPrefix]);

  return (
    <div className={`w-full${headerNode ? '' : ' h-screen'}`}>
      {sessionId || shareId ? <Agent /> : <Home headerNode={headerNode} footerNode={footerNode} />}
    </div>
  );
};

export default Chat;
