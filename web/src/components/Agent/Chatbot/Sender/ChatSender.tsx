import { Sender } from '@ant-design/x';
import { Badge, Button, Flex, Popover, Tooltip } from 'antd';
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import useChat from '@/hooks/useChat';
import {
  CustomIcon,
  FileList,
  FileUpload,
  KnowledgeBaseModal,
  MCPToolModal,
} from '@/components/Agent/Chatbot/Sender/components';
import type { FileItem, SessionInfo } from '@/types';
import ToolItem from './components/ToolItem';

const MAX_CONTENT_LENGTH = 3000;

const SenderContainer: React.FC = () => {
  const { t } = useTranslation();

  const [headerOpen, setHeaderOpen] = useState<boolean>(false);
  const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState<boolean>(false);
  const [mcpToolOpen, setMcpToolOpen] = useState<boolean>(false);

  const {
    basePath,
    agentId,
    sessionId,
    sessionInfo,
    senderLoading,
    setSenderLoading,
    senderContent,
    setSenderContent,
    senderFiles,
    setSenderFiles,
    senderKnowledgeBases,
    selectedSenderKnowledgeBases,
    setSelectedSenderKnowledgeBases,
    senderMCPTools,
    senderSandboxTools,
    selectedSenderMCPTools,
    setSelectedSenderMCPTools,
    senderStopping,
    setSenderStopping,
    senderSending,
  } = useAgentStore();

  const sessionActive = useMemo(() => {
    return sessionInfo?.status !== 'ARCHIVED';
  }, [sessionInfo?.status]);

  const { send, stop } = useChat(basePath, agentId, sessionId);

  const clearState = useCallback(() => {
    setSenderContent('');
    setSenderFiles([]);
    setHeaderOpen(false);
  }, [setSenderContent, setSenderFiles, setHeaderOpen]);

  const handleSend = useCallback(() => {
    if (senderContent.length === 0 || senderContent.length > MAX_CONTENT_LENGTH || senderLoading) {
      return;
    }
    send({
      content: senderContent,
      ...(senderFiles?.length && { files: senderFiles }),
      ...(selectedSenderKnowledgeBases?.length && { knowledgeBases: selectedSenderKnowledgeBases }),
      ...(selectedSenderMCPTools?.length && { mcpTools: selectedSenderMCPTools }),
    });
    clearState();
  }, [
    clearState,
    selectedSenderKnowledgeBases,
    selectedSenderMCPTools,
    send,
    senderContent,
    senderFiles,
    senderLoading,
  ]);

  const handleCancel = useCallback(() => {
    stop();
    setSenderStopping(true);
  }, [stop, setSenderStopping]);

  const handleRemoveFile = useCallback(
    (uid: string) => {
      setSenderFiles((pre: FileItem[]) => pre.filter((item: FileItem) => item.uid !== uid));
      if (senderFiles.length === 1) {
        setHeaderOpen(false);
      }
    },
    [senderFiles, setSenderFiles],
  );

  const handleFileStartUpload = useCallback(
    (params: FileItem) => {
      setHeaderOpen(true);
      setSenderFiles((pre: FileItem[]) => [...pre, ...[params]]);
    },
    [setSenderFiles],
  );

  const handleFileFinishUpload = useCallback(
    (params: FileItem) => {
      setSenderFiles((pre: FileItem[]) => {
        const index = pre.findIndex((item: FileItem) => item.uid === params.uid);
        if (index !== -1) {
          if (params.status === 'error') {
            // 上传失败，移除该文件
            return pre.filter((item: FileItem) => item.uid !== params.uid);
          } else {
            // 上传成功，更新该文件信息
            const newPre = [...pre];
            newPre[index] = params;
            return newPre;
          }
        }
        return pre;
      });
    },
    [setSenderFiles],
  );

  // 根据session信息更新已选的知识库和MCP工具
  const updateSelectedItems = useCallback(
    (session: SessionInfo) => {
      // 更新已选知识库列表
      const sessionKbIds = session?.kb_info?.kb_ids;
      if (sessionKbIds?.length && senderKnowledgeBases?.length) {
        const selectedKnowledgeBases = senderKnowledgeBases.filter((item) => sessionKbIds.includes(item.knowledge_id));
        setSelectedSenderKnowledgeBases(selectedKnowledgeBases);
      }

      // 更新已选MCP工具列表
      const sessionToolItems = session?.agent_tool_info?.agent_tool_items || [];
      const sessionMcpToolItems = sessionToolItems.filter((item) => item.agent_tool_type === 'MCP');
      const sessionAgentToolItems = sessionToolItems.filter((item) => item.agent_tool_type === 'SANDBOX');

      if (
        (sessionMcpToolItems?.length && senderMCPTools?.length) ||
        (sessionAgentToolItems?.length && senderSandboxTools?.length)
      ) {
        const selectedMCPTools =
          senderMCPTools?.filter((item) => sessionMcpToolItems.some((tool) => tool.agent_tool_id === item.id)) || [];
        const selectedSandboxTools =
          senderSandboxTools?.filter((item) =>
            sessionAgentToolItems.some((tool) => tool.agent_tool_id === item.agent_tool_id),
          ) || [];

        setSelectedSenderMCPTools([...selectedMCPTools, ...selectedSandboxTools]);
      }
    },
    [
      senderKnowledgeBases,
      senderMCPTools,
      senderSandboxTools,
      setSelectedSenderKnowledgeBases,
      setSelectedSenderMCPTools,
    ],
  );

  useEffect(() => {
    if (sessionInfo) {
      updateSelectedItems(sessionInfo);
    }

    return () => {
      if (sessionInfo) {
        setSelectedSenderKnowledgeBases([]);
        setSelectedSenderMCPTools(senderSandboxTools?.filter((item) => item.status === 'ACTIVE') || []);
      }
    };
  }, [
    sessionInfo,
    senderSandboxTools,
    updateSelectedItems,
    setSelectedSenderKnowledgeBases,
    setSelectedSenderMCPTools,
  ]);

  const headerNode = (
    <Sender.Header title="Attachments" open={headerOpen} onOpenChange={setHeaderOpen}>
      <FileList fileList={senderFiles} onRemove={handleRemoveFile} />
    </Sender.Header>
  );

  const renderToolButton = useCallback(
    (config: { selectedItems: any[]; iconType: string; onClick: () => void }) => {
      const { selectedItems, iconType, onClick } = config;

      if (sessionId && selectedItems.length === 0) {
        return null;
      }

      if (selectedItems.length === 0) {
        return (
          <Button
            shape="circle"
            icon={<CustomIcon type={iconType} />}
            disabled={!sessionActive}
            style={{ fontSize: '18px', width: '36px', height: '36px' }}
            onClick={onClick}
          />
        );
      }

      const getSelectedItemsDisplay = (iconType: string, selectedItems: any[]) => {
        if (iconType !== 'mcp') {
          return [
            {
              title: t('sender.mcp.selected.knowledge-base'),
              content: selectedItems,
            },
          ];
        }

        const serviceGroups = [
          {
            title: t('sender.mcp.selected.mcp-service'),
            filter: (item: any) => item.tool_type === undefined,
          },
          {
            title: t('sender.mcp.selected.sandbox'),
            filter: (item: any) => item.tool_type === 'SANDBOX',
          },
        ];

        return serviceGroups
          .map((group) => ({
            title: group.title,
            content: selectedItems.filter(group.filter),
          }))
          .filter((group) => group.content.length > 0);
      };

      const selectedItemsDisplay = getSelectedItemsDisplay(iconType, selectedItems);

      return (
        <Popover
          placement="top"
          arrow={false}
          content={
            <div className="flex flex-col gap-[16px]">
              {selectedItemsDisplay.map((item, index) => (
                <div className="flex flex-col gap-[12px]" key={index}>
                  <div className="text-[12px] text-[#999] leading-[12px]">{item.title}</div>
                  {item.content.map((item, index) => (
                    <ToolItem key={item.knowledge_id || item.id || index} item={item} index={index} />
                  ))}
                </div>
              ))}
            </div>
          }
        >
          <Button
            icon={<CustomIcon type={iconType} className="text-[20px]" />}
            disabled={!sessionActive || (!!selectedItems.length && !!sessionId)}
            style={{ height: '36px', padding: '0 12px', borderRadius: '20px' }}
            size="large"
            onClick={onClick}
          >
            {selectedItems.length}
          </Button>
        </Popover>
      );
    },
    [sessionActive, sessionId, t],
  );

  return (
    <div className="agentx-sender w-full bg-white rounded-[24px]">
      <Sender
        value={senderContent}
        disabled={!sessionActive}
        autoSize={{ minRows: 2, maxRows: 3 }}
        placeholder={t('sender.placeholder')}
        onChange={setSenderContent}
        onSubmit={handleSend}
        actions={false}
        header={headerNode}
        footer={({ components }) => {
          const { SendButton } = components;
          return (
            <Flex justify="space-between" align="center">
              <div>
              </div>
              <Flex align="center" gap={12}>
                {senderSending ? (
                  <Tooltip title="Stop">
                    <Button
                      type="primary"
                      shape="circle"
                      style={{ width: '36px', height: '36px' }}
                      onClick={handleCancel}
                      loading={senderStopping}
                    >
                      {!senderStopping && <div className="w-[14px] h-[14px] bg-white rounded-[4px]"></div>}
                    </Button>
                  </Tooltip>
                ) : (
                  <SendButton
                    type="primary"
                    disabled={!sessionActive || senderContent.length > MAX_CONTENT_LENGTH || senderLoading}
                    style={{ width: '36px', height: '36px', fontSize: '18px' }}
                  />
                )}
              </Flex>
            </Flex>
          );
        }}
      />
    </div>
  );
};

export default SenderContainer;
