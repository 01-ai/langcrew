import { useCallback, useMemo } from 'react';
import type { FileItem, MCPToolItem, ModelItem, KnowledgeBaseItem, MessageMetadata, SenderOptionConfig } from '@/types';
import { buildSenderSelectPayload, getEnglishLabel } from '../utils/senderOptions';

export const MAX_CONTENT_LENGTH = 3000;

interface SenderMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  agent_tools?: string[];
}

interface UseSenderSubmitProps {
  senderContent: string;
  senderFiles: FileItem[];
  senderMetadata?: MessageMetadata;
  senderLoading: boolean;
  previewSendDisabled?: boolean;
  selectedScene: string | null;
  showSenderActions: boolean;
  menuItems: SenderMenuItem[];
  selectedSenderKnowledgeBases: KnowledgeBaseItem[];
  selectedSenderMCPTools: MCPToolItem[];
  selectedSenderModels: ModelItem[];
  senderMCPTools: MCPToolItem[];
  senderSandboxTools: MCPToolItem[];
  senderPluginTools: MCPToolItem[];
  senderWorkflowTools: MCPToolItem[];
  senderSkillTools: MCPToolItem[];
  deepResearchOptions?: any;
  isDeepResearch: boolean;
  senderSelectOptions: SenderOptionConfig[];
  senderOptionsValues: Record<string, string>;
  setGeneralAgentMode: (mode?: string) => void;
  send: (payload: any) => void;
  clearState: () => void;
}

export const useSenderSubmit = ({
  senderContent,
  senderFiles,
  senderMetadata,
  senderLoading,
  previewSendDisabled,
  selectedScene,
  showSenderActions,
  menuItems,
  selectedSenderKnowledgeBases,
  selectedSenderMCPTools,
  selectedSenderModels,
  senderMCPTools,
  senderSandboxTools,
  senderPluginTools,
  senderWorkflowTools,
  senderSkillTools,
  deepResearchOptions,
  isDeepResearch,
  senderSelectOptions,
  senderOptionsValues,
  setGeneralAgentMode,
  send,
  clearState,
}: UseSenderSubmitProps) => {
  const hasUploadingFiles = useMemo(
    () => senderFiles.some((file) => file.status === 'uploading'),
    [senderFiles],
  );

  const isSendDisabled = useMemo(() => {
    return (
      !!previewSendDisabled ||
      senderContent.length === 0 ||
      senderContent.length > MAX_CONTENT_LENGTH ||
      senderLoading ||
      hasUploadingFiles
    );
  }, [previewSendDisabled, senderContent.length, senderLoading, hasUploadingFiles]);

  const handleSend = useCallback(() => {
    if (isSendDisabled) return;

    let toolsToSend = selectedSenderMCPTools;
    const selectedItem = showSenderActions ? menuItems.find((item) => item.key === selectedScene) : undefined;

    if (showSenderActions && selectedItem?.agent_tools?.length) {
      // Scene-selected tools are applied as a whitelist over all available tool sources.
      const allTools = [
        ...(senderMCPTools || []),
        ...(senderSandboxTools || []),
        ...(senderPluginTools || []),
        ...(senderWorkflowTools || []),
        ...(senderSkillTools || []),
      ];
      toolsToSend = allTools.filter((tool) => selectedItem.agent_tools?.includes(tool.agent_tool_id));
    }

    const agentMode = selectedItem?.key ? getEnglishLabel(selectedItem.key) : undefined;
    setGeneralAgentMode(agentMode);

    const senderSelectPayload = buildSenderSelectPayload(senderSelectOptions, senderOptionsValues);
    const deepResearchPayload =
      isDeepResearch && selectedScene === 'deep_research'
        ? (deepResearchOptions ?? { deepresearch: { mode: 'google_api' } })
        : deepResearchOptions;

    // Merge scene-level options and sender field options into one API `options` payload.
    const mergedOptions = {
      ...((deepResearchPayload && typeof deepResearchPayload === 'object' ? deepResearchPayload : {}) as Record<
        string,
        any
      >),
      ...senderSelectPayload,
    };

    send({
      content: senderContent,
      ...(senderFiles.length > 0 && { files: senderFiles }),
      ...(senderMetadata !== undefined && { metadata: senderMetadata }),
      ...(selectedSenderKnowledgeBases.length > 0 && { knowledgeBases: selectedSenderKnowledgeBases }),
      ...(toolsToSend.length > 0 && { mcpTools: toolsToSend }),
      ...(selectedSenderModels.length > 0 && { models: selectedSenderModels }),
      ...(Object.keys(mergedOptions).length > 0 && { options: mergedOptions }),
    });

    clearState();
  }, [
    isSendDisabled,
    selectedSenderMCPTools,
    showSenderActions,
    menuItems,
    selectedScene,
    senderMCPTools,
    senderSandboxTools,
    senderPluginTools,
    senderWorkflowTools,
    senderSkillTools,
    setGeneralAgentMode,
    senderSelectOptions,
    senderOptionsValues,
    isDeepResearch,
    deepResearchOptions,
    send,
    senderContent,
    senderFiles,
    senderMetadata,
    selectedSenderKnowledgeBases,
    selectedSenderModels,
    clearState,
  ]);

  return {
    handleSend,
    hasUploadingFiles,
    isSendDisabled,
  };
};
