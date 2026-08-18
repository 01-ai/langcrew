import { useCallback, useMemo } from 'react';
import type { SlotConfigType } from '@ant-design/x/es/sender/interface';
import type {
  FileItem,
  ModelItem,
  KnowledgeBaseItem,
  Mention,
  MessageMetadata,
  SenderOptionConfig,
} from '@/types';
import { slotConfigToMentions } from '@/utils/mentions';
import { buildSenderSelectPayload, getEnglishLabel } from '../utils/senderOptions';

export const MAX_CONTENT_LENGTH = 3000;

interface SenderMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface UseSenderSubmitProps {
  senderContent: string;
  senderMentions: Mention[];
  senderFiles: FileItem[];
  senderMetadata?: MessageMetadata;
  senderLoading: boolean;
  previewSendDisabled?: boolean;
  selectedScene: string | null;
  showSenderActions: boolean;
  menuItems: SenderMenuItem[];
  selectedSenderKnowledgeBases: KnowledgeBaseItem[];
  selectedSenderModels: ModelItem[];
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
  senderMentions,
  senderFiles,
  senderMetadata,
  senderLoading,
  previewSendDisabled,
  selectedScene,
  showSenderActions,
  menuItems,
  selectedSenderKnowledgeBases,
  selectedSenderModels,
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

  const handleSend = useCallback(
    (message?: string, nextSlotConfig?: SlotConfigType[]) => {
      if (isSendDisabled && message === undefined) return;

      const content = typeof message === 'string' ? message : senderContent;
      const mentions =
        nextSlotConfig !== undefined ? slotConfigToMentions(nextSlotConfig) : senderMentions;

      if (
        !!previewSendDisabled ||
        content.length === 0 ||
        content.length > MAX_CONTENT_LENGTH ||
        senderLoading ||
        hasUploadingFiles
      ) {
        return;
      }

      const selectedItem = showSenderActions ? menuItems.find((item) => item.key === selectedScene) : undefined;
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
        content,
        ...(mentions.length > 0 && { mentions }),
        ...(senderFiles.length > 0 && { files: senderFiles }),
        ...(senderMetadata !== undefined && { metadata: senderMetadata }),
        ...(selectedSenderKnowledgeBases.length > 0 && { knowledgeBases: selectedSenderKnowledgeBases }),
        ...(selectedSenderModels.length > 0 && { models: selectedSenderModels }),
        ...(Object.keys(mergedOptions).length > 0 && { options: mergedOptions }),
      });

      clearState();
    },
    [
      isSendDisabled,
      previewSendDisabled,
      senderLoading,
      hasUploadingFiles,
      showSenderActions,
      menuItems,
      selectedScene,
      setGeneralAgentMode,
      senderSelectOptions,
      senderOptionsValues,
      isDeepResearch,
      deepResearchOptions,
      send,
      senderContent,
      senderMentions,
      senderFiles,
      senderMetadata,
      selectedSenderKnowledgeBases,
      selectedSenderModels,
      clearState,
    ],
  );

  return {
    handleSend,
    hasUploadingFiles,
    isSendDisabled,
  };
};
