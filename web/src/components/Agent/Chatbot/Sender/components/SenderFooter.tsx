import React from 'react';
import { Button, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { FileItem, AgentTool, Mention, ModelItem, SenderOptionConfig } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import ToolIcon from '@/assets/svg/labels/tool.svg?react';
import KnowledgeBaseIcon from '@/assets/svg/labels/select-knowledge-base.svg?react';
import SendIcon from '@/assets/svg/sender/sender-icon.svg?react';
import GreySendIcon from '@/assets/svg/sender/grey-send.svg?react';
import { saveSelectedModel } from '@/utils/modelStorage';
import FileUpload from './FileUpload';
import KnowledgeBaseModal from './KnowledgeBaseModal';
import ModelSelector from './ModelSelector';
import SenderOptionsFields from './SenderOptionsFields';
import SenderQuickActions from './SenderQuickActions';
import DeepResearchFooter from './DeepResearchFooter';
import ToolMenuPopover from './ToolMenuPopover';

interface SenderMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface SenderFooterProps {
  state: {
    senderDisabled: boolean;
    knowledgeReadonly?: boolean;
    knowledgeBaseOpen: boolean;
    quickActionOpen: boolean;
    headerOpen: boolean;
    selectedScene: string | null;
    selectedItem?: SenderMenuItem;
    senderContentLength: number;
    maxContentLength: number;
    senderSending: boolean;
    senderStopping: boolean;
    previewSendDisabled?: boolean;
    previewSendDisabledTooltip?: string;
    isSendDisabled: boolean;
    shouldShowDeepResearch: boolean;
    deepResearchMode: 'google_api' | 'self_configured';
    deepResearchSource: string;
  };
  upload: {
    senderFiles: FileItem[];
    senderFilesConfig: {
      maxLength: number;
    };
    fileUploadRef: React.RefObject<any>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    fileUploadDisabled?: boolean;
    onFileStartUpload: (params: FileItem) => void;
    onFileFinishUpload: (params: FileItem) => void;
    onQuickActionOpenChange: (open: boolean) => void;
  };
  scene: {
    showSenderActions: boolean;
    senderKnowledgeBasesLength: number;
    selectedSenderKnowledgeBasesLength: number;
    menuItems: SenderMenuItem[];
    onKnowledgeBaseOpenChange: (open: boolean) => void;
    onSelectedSceneChange: (scene: string | null) => void;
    onClearKnowledgeBases: () => void;
    hasTools: boolean;
    tools: AgentTool[];
    toolMenuOpen: boolean;
    onToolMenuOpenChange: (open: boolean) => void;
    toolMenuQuery?: string;
    onPickMention?: (mention: Mention) => void;
    onRemoveMention?: (mention: Mention) => void;
    onManageSkills?: () => void;
    toolReadonly?: boolean;
  };
  options: {
    senderSelectOptions: SenderOptionConfig[];
    senderOptionsValues: Record<string, string>;
    onSenderOptionChange: (field: string, value: string) => void;
  };
  model: {
    senderModels?: ModelItem[];
    selectedSenderModels: ModelItem[];
    setSelectedSenderModels: (models: ModelItem[]) => void;
  };
  actions: {
    stop: () => void;
    onSetDeepResearchMode: (mode: 'google_api' | 'self_configured') => void;
    onSetDeepResearchSource: (source: string) => void;
  };
  SendButton: any;
}

const SenderFooter: React.FC<SenderFooterProps> = ({
  state,
  upload,
  scene,
  options,
  model,
  actions,
  SendButton,
}) => {
  const { t } = useTranslation();
  const {
    senderDisabled,
    knowledgeReadonly,
    knowledgeBaseOpen,
    quickActionOpen,
    headerOpen,
    selectedScene,
    selectedItem,
    senderContentLength,
    maxContentLength,
    senderSending,
    senderStopping,
    previewSendDisabled,
    previewSendDisabledTooltip,
    isSendDisabled,
    shouldShowDeepResearch,
    deepResearchMode,
    deepResearchSource,
  } = state;
  const { senderFiles, senderFilesConfig, fileUploadRef, fileInputRef, fileUploadDisabled } = upload;
  const {
    showSenderActions,
    senderKnowledgeBasesLength,
    selectedSenderKnowledgeBasesLength,
    menuItems,
    onKnowledgeBaseOpenChange,
    onSelectedSceneChange,
    onClearKnowledgeBases,
    hasTools,
    tools,
    toolMenuOpen,
    onToolMenuOpenChange,
    toolMenuQuery,
    onPickMention,
    onRemoveMention,
    onManageSkills,
    toolReadonly,
  } = scene;
  const { senderSelectOptions, senderOptionsValues, onSenderOptionChange } = options;
  const { senderModels, selectedSenderModels, setSelectedSenderModels } = model;
  const { stop, onSetDeepResearchMode, onSetDeepResearchSource } = actions;

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center agentx-sender-footer ml-[-12px]">
        <div className="flex gap-1 items-center agentx-sender-footer__left">
          <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <FileUpload
              disabled={senderDisabled || senderFiles.length >= senderFilesConfig.maxLength}
              ref={fileUploadRef}
              onStart={upload.onFileStartUpload}
              onFinish={upload.onFileFinishUpload}
            />
          </div>

          <SenderQuickActions
            fileUploadDisabled={fileUploadDisabled}
            showSenderActions={showSenderActions}
            hasKnowledgeBases={senderKnowledgeBasesLength > 0}
            sessionActive={!senderDisabled}
            knowledgeReadonly={knowledgeReadonly}
            senderFilesLength={senderFiles.length}
            maxFileLength={senderFilesConfig.maxLength}
            headerOpen={headerOpen}
            quickActionOpen={quickActionOpen}
            setQuickActionOpen={upload.onQuickActionOpenChange}
            openKnowledgeBaseModal={() => onKnowledgeBaseOpenChange(true)}
            fileInputRef={fileInputRef}
          />

          {knowledgeBaseOpen && <KnowledgeBaseModal onClose={() => onKnowledgeBaseOpenChange(false)} />}

          {(menuItems.length > 0 || hasTools) && showSenderActions && (
            <ToolMenuPopover
              open={toolMenuOpen}
              onOpenChange={onToolMenuOpenChange}
              disabled={senderDisabled}
              menuItems={menuItems}
              selectedScene={selectedScene}
              onSelectScene={onSelectedSceneChange}
              tools={tools}
              query={toolMenuQuery}
              onPickMention={onPickMention}
              onRemoveMention={onRemoveMention}
              onManageSkills={onManageSkills}
              toolReadonly={toolReadonly}
            >
              <Button
                shape="round"
                className={`agentx-tool-btn ${selectedScene ? 'agentx-tool-btn--icon-only' : ''}`}
                icon={<ToolIcon />}
                disabled={senderDisabled}
              >
                {!selectedScene && t('tool')}
              </Button>
            </ToolMenuPopover>
          )}
          {showSenderActions && selectedScene && (
            <Button
              type="text"
              shape="round"
              className="flex items-center gap-1 px-3 h-9 text-sm agentx-selected-scene"
              onClick={() => onSelectedSceneChange(null)}
            >
              {selectedItem?.icon ? <span className="agentx-selected-scene__icon">{selectedItem.icon}</span> : null}
              {selectedItem?.label ?? selectedScene}
              <span
                className="agentx-selected-scene__close"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectedSceneChange(null);
                }}
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </span>
            </Button>
          )}

          {selectedSenderKnowledgeBasesLength > 0 && (
            <div className="agentx-selected-kb-list">
              <Button
                type="text"
                shape="round"
                className="flex items-center gap-1 px-3 h-9 text-sm agentx-selected-kb group"
                disabled={senderDisabled || knowledgeReadonly}
                onClick={() => onKnowledgeBaseOpenChange(true)}
              >
                <span className="agentx-selected-kb__icon">
                  <KnowledgeBaseIcon />
                </span>
                <span className="agentx-selected-kb__text" title={t('sender.knowledge-base')}>
                  {t('sender.knowledge-base')}
                </span>
                <span
                  className="agentx-selected-kb__close-inner ml-1 flex items-center justify-center"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClearKnowledgeBases();
                  }}
                >
                  <CloseOutlined style={{ fontSize: 12 }} />
                </span>
              </Button>
            </div>
          )}

          <SenderOptionsFields
            options={senderSelectOptions}
            values={senderOptionsValues}
            disabled={senderDisabled}
            onChange={onSenderOptionChange}
          />

          {senderContentLength > 500 && (
            <div className="text-[12px] text-[#999] leading-[12px] flex items-center">
              <div className={senderContentLength > maxContentLength ? 'text-[#f5222d]' : ''}>{senderContentLength}</div>/
              {maxContentLength}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 agentx-sender-footer__right">
          {!!senderModels?.length && (
            <ModelSelector
              models={senderModels}
              selectedModels={selectedSenderModels}
              onModelSelect={(modelId) => {
                if (modelId === '') {
                  setSelectedSenderModels([]);
                  saveSelectedModel(null);
                  return;
                }
                const selectedModel = senderModels?.find((model) => model.id === modelId);
                if (selectedModel) {
                  setSelectedSenderModels([selectedModel]);
                  saveSelectedModel(selectedModel);
                }
              }}
              disabled={senderDisabled}
            />
          )}

          {senderSending ? (
            <Tooltip title={t('sender.stop')}>
              <Button
                type="primary"
                shape="circle"
                style={{ width: '36px', height: '36px' }}
                className="agentx-send-btn"
                onClick={stop}
                loading={senderStopping}
              >
                {!senderStopping && <div className="w-[14px] h-[14px] bg-white rounded-[4px]" />}
              </Button>
            </Tooltip>
          ) : (
            <Tooltip
              title={
                previewSendDisabled
                  ? previewSendDisabledTooltip || t('sender.disabled_tooltip')
                  : undefined
              }
            >
              <SendButton
                icon={isSendDisabled ? <GreySendIcon /> : <SendIcon />}
                type="primary"
                className="agentx-send-btn"
                disabled={isSendDisabled}
                style={{ width: '36px', height: '36px', fontSize: '18px' }}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {shouldShowDeepResearch && (
        <div className="w-full mt-2 px-1 pb-2">
          <DeepResearchFooter
            mode={deepResearchMode}
            source={deepResearchSource}
            onSetMode={onSetDeepResearchMode}
            onSetSource={onSetDeepResearchSource}
          />
        </div>
      )}
    </div>
  );
};

export default SenderFooter;
