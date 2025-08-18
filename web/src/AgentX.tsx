import React, { useEffect, useState } from 'react';
import Agent from '@/components/Agent';
import Home from '@/components/Home';
import { useAgentStore } from '@/store';
import { KnowledgeBaseItem, MCPToolItem, AgentMode } from '@/types';
import { changeLanguage } from '@/hooks/useTranslation';
import '@/registry/builtin';
import './index.css';

interface AgentProps {
  agentId: string;
  sessionId?: string;
  shareId?: string;
  sharePassword?: string;
  basePath?: string;
  backPath?: string;
  headerNode?: React.ReactNode;
  footerNode?: React.ReactNode;
  // 分享按钮
  shareButtonNode?: React.ReactNode;
  knowledgeBases?: KnowledgeBaseItem[];
  mcpTools?: MCPToolItem[];
  sandboxTools?: MCPToolItem[];
  selectedKnowledgeBases?: string[];
  selectedTools?: string[];
  // 请求前缀，万智传/app
  requestPrefix?: string;
  // 额外请求头
  extraHeaders?: Record<string, string>;
  // 语言
  language?: string;
  // 发送内容
  senderContent?: string;
}

const AgentX = (props: AgentProps) => {
  const {
    agentId,
    sessionId,
    shareId,
    sharePassword,
    basePath,
    backPath,
    headerNode,
    footerNode,
    shareButtonNode,
    knowledgeBases,
    mcpTools,
    sandboxTools,
    selectedTools,
    selectedKnowledgeBases,
    extraHeaders,
    requestPrefix,
    language,
    senderContent,
  } = props;

  const {
    setBasePath,
    setBackPath,
    setAgentId,
    setSessionId,
    setShareId,
    setSharePassword,
    setMode,
    setSenderKnowledgeBases,
    setSenderMCPTools,
    setSenderSandboxTools,
    setSelectedSenderKnowledgeBases,
    setSelectedSenderMCPTools,
    setExtraHeaders,
    setRequestPrefix,
    setSenderContent,
  } = useAgentStore();

  useEffect(() => {
    if (basePath !== useAgentStore.getState().basePath) {
      setBasePath(basePath);
    }
    if (backPath !== useAgentStore.getState().backPath) {
      setBackPath(backPath);
    }
    if (agentId !== useAgentStore.getState().agentId) {
      setAgentId(agentId);
    }
    if (sessionId !== useAgentStore.getState().sessionId) {
      setSessionId(sessionId || null);
    }
  }, [basePath, backPath, agentId, sessionId, setBasePath, setAgentId, setSessionId, setBackPath]);

  useEffect(() => {
    if (shareId) {
      setShareId(shareId);
      setSharePassword(sharePassword);
      setMode(AgentMode.Replay);
    } else {
      setMode(AgentMode.Chatbot);
    }

    setSenderMCPTools(mcpTools || []);

    return () => {
      setShareId('');
      setSharePassword('');
      setMode(AgentMode.Chatbot);
    };
  }, []);

  useEffect(() => {
    setSenderKnowledgeBases(knowledgeBases || []);
    if (!sessionId && Array.isArray(selectedKnowledgeBases) && knowledgeBases?.length) {
      const selectedItems = knowledgeBases.filter((item) => selectedKnowledgeBases.includes(item.knowledge_id));
      setSelectedSenderKnowledgeBases(selectedItems);
    }
  }, [sessionId, selectedKnowledgeBases, knowledgeBases, setSenderKnowledgeBases, setSelectedSenderKnowledgeBases]);

  useEffect(() => {
    setSenderMCPTools(mcpTools || []);
  }, [mcpTools, setSenderMCPTools]);

  useEffect(() => {
    setSenderSandboxTools(sandboxTools || []);
    if (!sessionId && Array.isArray(selectedTools) && sandboxTools?.length) {
      const selectedItems = sandboxTools.filter((item) => selectedTools.includes(item.agent_tool_id));
      setSelectedSenderMCPTools(selectedItems);
    }
  }, [sessionId, selectedTools, sandboxTools, setSenderSandboxTools, setSelectedSenderMCPTools]);

  useEffect(() => {
    setExtraHeaders(extraHeaders || {});
    setRequestPrefix(requestPrefix || '');
  }, [extraHeaders, setExtraHeaders, requestPrefix, setRequestPrefix]);

  useEffect(() => {
    if (language) {
      changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof senderContent === 'string') {
      setSenderContent(senderContent);
    }
  }, [senderContent, setSenderContent]);

  return (
    <div className={`w-full${headerNode ? '' : ' h-screen'}`}>
      {sessionId || shareId ? (
        <Agent shareButtonNode={shareButtonNode} />
      ) : (
        <Home headerNode={headerNode} footerNode={footerNode} />
      )}
    </div>
  );
};

export default AgentX;
