import { Sender, Suggestion } from '@ant-design/x';
import type { SenderRef } from '@ant-design/x/es/sender/interface';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore, useAgentStoreApi } from '@/store';
import useChat from '@/hooks/useChat';
import { FileList, SenderFooter } from '@/components/Agent/Chatbot/Sender/components';
import MessageMetadataRenderer from '@/components/Agent/Chatbot/MessageMetadataRenderer';
import type { SenderOptionConfig } from '@/types';
import DisabledSender from './DisabledSender';
import { useSenderSubmit, MAX_CONTENT_LENGTH } from './hooks/useSenderSubmit';
import { useSenderFileHandlers } from './hooks/useSenderFileHandlers';
import { useSenderSessionSync } from './hooks/useSenderSessionSync';
import { normalizeSenderOptionValues } from './utils/senderOptions';
import eventBus from '@/utils/eventBus';
import classNames from 'classnames';
import { hasActiveHitlApprovalRequest } from '@/hooks/useChat/utils';
import './index.less';

interface SenderMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  agent_tools?: string[];
}

const PASTED_TEXT_FILE_BASE_NAME = 'pasted_content';
const PASTED_TEXT_FILE_EXTENSION = '.txt';
const PASTED_TEXT_FILE_NAME_REGEXP = /^pasted_content(\d*)\.txt$/;
const DRAGGED_FILE_TYPE = 'Files';

const hasDraggedFiles = (dataTransfer: DataTransfer) => Array.from(dataTransfer.types).includes(DRAGGED_FILE_TYPE);

const getPastedTextFileIndex = (fileName: string) => {
  const match = PASTED_TEXT_FILE_NAME_REGEXP.exec(fileName);
  if (!match) return null;

  if (!match[1]) return 1;

  const index = Number(match[1]);
  return Number.isInteger(index) && index > 1 ? index : null;
};

const formatPastedTextFileName = (index: number) =>
  `${PASTED_TEXT_FILE_BASE_NAME}${index === 1 ? '' : index}${PASTED_TEXT_FILE_EXTENSION}`;

const SenderContainer: React.FC<{
  basePath?: string;
  agentId?: string;
  sessionId?: string;
  menuItems?: SenderMenuItem[];
  showSenderActions?: boolean;
  topAddon?: React.ReactNode;
}> = ({
  basePath: propsBasePath,
  agentId: propsAgentId,
  sessionId: propsSessionId,
  menuItems: propsMenuItems,
  showSenderActions = false,
  topAddon,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const storeApi = useAgentStoreApi();

  const fileUploadRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextPastedTextFileIndexRef = useRef(1);
  const dragEnterCounterRef = useRef(0);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const isDeepResearch = location.search.includes('kw=deepresearch');

  const {
    basePath: storeBasePath,
    agentId: storeAgentId,
    sessionId: storeSessionId,
    sessionInfo,
    senderLoading,
    senderContent,
    setSenderContent,
    senderFiles,
    setSenderFiles,
    senderMetadata,
    setSenderMetadata,
    renderMessageMetadata,
    instanceId,
    senderFilesConfig,
    senderKnowledgeBases,
    selectedSenderKnowledgeBases,
    setSelectedSenderKnowledgeBases,
    senderMCPTools,
    senderSandboxTools,
    senderPluginTools,
    senderWorkflowTools,
    senderSkillTools,
    selectedSenderMCPTools,
    setSelectedSenderMCPTools,
    senderStopping,
    senderSending,
    knowledgeReadonly,
    fileUploadDisabled,
    selectedSenderModels,
    setSelectedSenderModels,
    senderModels,
    previewConfig,
    senderConfig,
    placeholder,
    setGeneralAgentMode,
    setDeepResearchOptions,
    generalAgentMode,
    deepResearchOptions,
    senderOptionsConfig,
    senderOptionsValues,
    setSenderOptionsValues,
    pipelineMessages,
  } = useAgentStore();

  const deepResearchMode = useMemo(
    () => deepResearchOptions?.deepresearch?.mode || 'google_api',
    [deepResearchOptions],
  );
  const deepResearchSource = useMemo(() => deepResearchOptions?.deepresearch?.search || 'serp', [deepResearchOptions]);

  const senderSelectOptions = useMemo(
    () => senderOptionsConfig.filter((item) => item.type === 'select' && item.field && item.options?.length > 0),
    [senderOptionsConfig],
  );

  useEffect(() => {
    // Keep store values always aligned with dynamic option config
    // (remove stale fields and auto-fill defaults for invalid selections).
    const normalized = normalizeSenderOptionValues(senderSelectOptions as SenderOptionConfig[], senderOptionsValues);
    const changed =
      Object.keys(normalized).length !== Object.keys(senderOptionsValues).length ||
      Object.keys(normalized).some((field) => normalized[field] !== senderOptionsValues[field]);
    if (changed) {
      setSenderOptionsValues(normalized);
    }
  }, [senderSelectOptions, senderOptionsValues, setSenderOptionsValues]);

  const basePath = propsBasePath || storeBasePath || '';
  const agentId = propsAgentId || storeAgentId || '';
  const sessionId = propsSessionId || storeSessionId || '';
  const isPPTAssistant = agentId === 'ppt_assistant';
  const headerOpen = senderFiles.length > 0;
  const sessionActive = sessionInfo?.status !== 'ARCHIVED';
  const latestPipelineMessage = pipelineMessages[pipelineMessages.length - 1];
  const pendingHitlApproval = hasActiveHitlApprovalRequest(latestPipelineMessage);
  const senderDisabled = !sessionActive || !!senderConfig?.inputDisabled || pendingHitlApproval;
  const uploadDisabled = fileUploadDisabled || !!senderConfig?.inputDisabled || pendingHitlApproval;
  const isSingleLineInput = senderConfig?.inputMode === 'singleLine';
  const senderAutoSize = isSingleLineInput ? { minRows: 1, maxRows: 15 } : { minRows: 2, maxRows: 15 };
  const menuItems = useMemo(() => propsMenuItems || [], [propsMenuItems]);
  const skills = useMemo(() => senderConfig?.skills ?? [], [senderConfig?.skills]);
  // Ref stores the latest Suggestion `onTrigger` so the onChange handler can call it
  const skillTriggerRef = useRef<((info: { search: string } | false) => void) | null>(null);
  // Ref to the Sender component for restoring focus after skill selection
  const senderRef = useRef<SenderRef>(null);
  const selectedItem = useMemo(() => menuItems.find((item) => item.key === selectedScene), [menuItems, selectedScene]);

  const { send, stop } = useChat(basePath, agentId, sessionId);

  useEffect(() => {
    const focusSender = () => {
      senderRef.current?.focus();
    };

    eventBus.on(`focus_sender_${instanceId}`, focusSender);
    return () => {
      eventBus.off(`focus_sender_${instanceId}`, focusSender);
    };
  }, [instanceId]);

  const clearState = useCallback(() => {
    setSenderContent('');
    setSenderFiles([]);
    setSenderMetadata(undefined);
  }, [setSenderContent, setSenderFiles, setSenderMetadata]);

  // Detect "/" trigger for skill suggestions
  const handleSenderChange = useCallback(
    (val: string) => {
      setSenderContent(val);
      if (skills.length && skillTriggerRef.current) {
        // Match a "/" optionally followed by word/Chinese chars at the end of input
        const match = val.match(/\/([\u4e00-\u9fa5\w]*)$/);
        skillTriggerRef.current(match ? { search: match[1] } : false);
      }
    },
    [setSenderContent, skills],
  );

  const handleSkillSelect = useCallback(
    (value: string) => {
      const skill = skills.find((s) => s.value === value);
      if (!skill) return;
      const label = String(skill.label ?? skill.value);
      // Replace the trailing "/<search>" with the full skill label + trailing space
      setSenderContent(senderContent.replace(/\/([\u4e00-\u9fa5\w]*)$/, label + ' '));
      // Close the suggestion panel
      skillTriggerRef.current?.(false);
      // Restore focus to the textarea (Cascader steals it on selection)
      setTimeout(() => senderRef.current?.focus(), 0);
    },
    [skills, senderContent, setSenderContent],
  );

  const { handlePaste, handleRemoveFile, handleFileStartUpload, handleFileFinishUpload } = useSenderFileHandlers({
    fileUploadDisabled: uploadDisabled,
    fileUploadRef,
    senderFiles,
    senderFilesConfig,
    setSenderFiles,
  });

  const createPastedTextFileName = useCallback(() => {
    const usedIndexes = new Set(
      senderFiles
        .map((file) => getPastedTextFileIndex(file.name))
        .filter((index): index is number => typeof index === 'number'),
    );
    let nextIndex = nextPastedTextFileIndexRef.current;

    while (usedIndexes.has(nextIndex)) {
      nextIndex += 1;
    }

    nextPastedTextFileIndexRef.current = nextIndex + 1;
    return formatPastedTextFileName(nextIndex);
  }, [senderFiles]);

  const handleSenderPasteCapture = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (uploadDisabled || event.clipboardData.files.length > 0) return;

      const pastedText = event.clipboardData.getData('text/plain');
      if (Array.from(pastedText).length <= MAX_CONTENT_LENGTH) return;

      event.preventDefault();
      const pastedFile = new File([pastedText], createPastedTextFileName(), { type: 'text/plain' });
      void handlePaste([pastedFile]);
    },
    [createPastedTextFileName, uploadDisabled, handlePaste],
  );

  const resetFileDragState = useCallback(() => {
    dragEnterCounterRef.current = 0;
    setFileDragActive(false);
  }, []);

  const handleSenderDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event.dataTransfer)) return;

      event.preventDefault();
      event.stopPropagation();
      if (uploadDisabled) {
        resetFileDragState();
        return;
      }

      dragEnterCounterRef.current += 1;
      setFileDragActive(true);
    },
    [uploadDisabled, resetFileDragState],
  );

  const handleSenderDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event.dataTransfer)) return;

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = uploadDisabled ? 'none' : 'copy';
    },
    [uploadDisabled],
  );

  const handleSenderDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) return;

    event.preventDefault();
    event.stopPropagation();
    dragEnterCounterRef.current = Math.max(0, dragEnterCounterRef.current - 1);
    if (dragEnterCounterRef.current === 0) {
      setFileDragActive(false);
    }
  }, []);

  const handleSenderDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event.dataTransfer)) return;

      event.preventDefault();
      event.stopPropagation();
      resetFileDragState();

      const files = event.dataTransfer.files;
      if (uploadDisabled || files.length === 0) return;

      void handlePaste(files);
    },
    [uploadDisabled, handlePaste, resetFileDragState],
  );

  const handleClearKnowledgeBases = useCallback(() => {
    setSelectedSenderKnowledgeBases([]);
  }, [setSelectedSenderKnowledgeBases]);

  const handleRemoveReference = useCallback(() => {
    if (!senderMetadata) return;

    const nextMetadata = { ...senderMetadata };
    delete nextMetadata.reference;
    setSenderMetadata(Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined);
  }, [senderMetadata, setSenderMetadata]);

  const handleSenderOptionChange = useCallback(
    (field: string, value: string) => {
      const currentValues = storeApi.getState().senderOptionsValues;
      setSenderOptionsValues({
        ...currentValues,
        [field]: value,
      });
    },
    [storeApi, setSenderOptionsValues],
  );

  useSenderSessionSync({
    sessionInfo,
    showSenderActions,
    menuItems,
    selectedScene,
    setSelectedScene,
    generalAgentMode,
    setGeneralAgentMode,
    senderKnowledgeBases,
    selectedSenderKnowledgeBases,
    setSelectedSenderKnowledgeBases,
    senderMCPTools,
    senderSandboxTools,
    senderPluginTools,
    senderWorkflowTools,
    senderSkillTools,
    setSelectedSenderMCPTools,
    senderModels,
    selectedSenderModels,
    setSelectedSenderModels,
    storeApi,
  });

  const { handleSend, isSendDisabled } = useSenderSubmit({
    senderContent,
    senderFiles,
    senderMetadata,
    senderLoading,
    previewSendDisabled: senderConfig?.sendDisabled,
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
  });

  const menuProps = useMemo(() => {
    return {
      items: menuItems,
      onClick: (event: { key: string }) => setSelectedScene(event.key),
      className: 'agentx-tool-menu',
      selectedKeys: selectedScene ? [selectedScene] : [],
    };
  }, [menuItems, selectedScene]);

  const handleNewChat = useCallback(() => {
    navigate(`${basePath}/${agentId}${location.search}`);
  }, [navigate, basePath, agentId, location.search]);

  const handleSetDeepResearchMode = useCallback(
    (mode: 'google_api' | 'self_configured') => {
      const nextOptions = {
        deepresearch:
          mode === 'google_api'
            ? { mode: 'google_api' }
            : {
                mode: 'self_configured',
                search: deepResearchSource,
              },
      };
      setDeepResearchOptions(nextOptions);
    },
    [deepResearchSource, setDeepResearchOptions],
  );

  const handleSetDeepResearchSource = useCallback(
    (source: string) => {
      setDeepResearchOptions({
        deepresearch: {
          mode: 'self_configured',
          search: source,
        },
      });
    },
    [setDeepResearchOptions],
  );

  const headerNode = (
    <Sender.Header title={false} closable={false} open={headerOpen}>
      <FileList fileList={senderFiles} onRemove={handleRemoveFile} />
    </Sender.Header>
  );

  const renderSender = (extraProps?: { onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement> }) => (
    <Sender
      ref={senderRef}
      value={senderContent}
      disabled={senderDisabled}
      autoSize={senderAutoSize}
      placeholder={placeholder || t('sender.placeholder')}
      onChange={handleSenderChange}
      onSubmit={handleSend}
      onPasteFile={uploadDisabled ? undefined : handlePaste}
      onKeyDown={extraProps?.onKeyDown}
      suffix={false}
      header={headerNode}
      footer={(_, { components }) => {
        // Delegate all footer rendering/interaction wiring to presentation component,
        // while ChatSender stays as an orchestration container.
        return (
          <SenderFooter
            state={{
              senderDisabled,
              isPPTAssistant,
              knowledgeReadonly,
              knowledgeBaseOpen,
              quickActionOpen,
              headerOpen,
              selectedScene,
              selectedItem,
              senderContentLength: senderContent.length,
              maxContentLength: MAX_CONTENT_LENGTH,
              senderSending,
              senderStopping,
              previewSendDisabled: senderConfig?.sendDisabled,
              previewSendDisabledTooltip: senderConfig?.sendDisabledTooltip,
              isSendDisabled: isSendDisabled || senderDisabled,
              shouldShowDeepResearch: isDeepResearch && selectedScene === 'deep_research',
              deepResearchMode,
              deepResearchSource,
            }}
            upload={{
              senderFiles,
              senderFilesConfig,
              fileUploadRef,
              fileInputRef,
              fileUploadDisabled: uploadDisabled,
              onFileStartUpload: handleFileStartUpload,
              onFileFinishUpload: handleFileFinishUpload,
              onQuickActionOpenChange: setQuickActionOpen,
            }}
            scene={{
              showSenderActions,
              senderKnowledgeBasesLength: senderKnowledgeBases.length,
              selectedSenderKnowledgeBasesLength: selectedSenderKnowledgeBases.length,
              menuItems,
              menuProps,
              agentId,
              onKnowledgeBaseOpenChange: setKnowledgeBaseOpen,
              onSelectedSceneChange: setSelectedScene,
              onClearKnowledgeBases: handleClearKnowledgeBases,
            }}
            options={{
              senderSelectOptions,
              senderOptionsValues,
              onSenderOptionChange: handleSenderOptionChange,
            }}
            model={{
              senderModels,
              selectedSenderModels,
              setSelectedSenderModels,
            }}
            actions={{
              stop,
              onSetDeepResearchMode: handleSetDeepResearchMode,
              onSetDeepResearchSource: handleSetDeepResearchSource,
            }}
            SendButton={components.SendButton}
          />
        );
      }}
      className={classNames('agentx-sender-container', {
        'agentx-sender-container--single-line': isSingleLineInput,
      })}
    />
  );

  if (sessionInfo && !sessionActive) {
    return <DisabledSender onNewChat={handleNewChat} />;
  }

  return (
    <div className="w-full">
      {topAddon ? <div className="px-[28px]">{topAddon}</div> : null}
      {senderMetadata ? (
        <div className="w-full max-w-full mb-3">
          <MessageMetadataRenderer
            metadata={senderMetadata}
            variant="draft"
            onReferenceRemove={handleRemoveReference}
            renderMessageMetadata={renderMessageMetadata}
          />
        </div>
      ) : null}
      <div
        className={`agentx-sender w-full ${fileDragActive ? 'agentx-sender--drag-active' : ''}`}
        onPasteCapture={handleSenderPasteCapture}
        onDragEnter={handleSenderDragEnter}
        onDragOver={handleSenderDragOver}
        onDragLeave={handleSenderDragLeave}
        onDrop={handleSenderDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={uploadDisabled}
          className="hidden"
          // 2026-05-21：Remove File Type Limit
          // accept={senderFilesConfig.accept || ALLOWED_FILES}
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length > 0) {
              handlePaste(files);
            }
            event.target.value = '';
          }}
        />

        {skills.length > 0 ? (
          <Suggestion<{ search: string }>
            items={(info) => {
              const search = info?.search ?? '';
              const matched = skills
                .filter(
                  (s) =>
                    !search ||
                    String(s.label ?? s.value)
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    s.value.toLowerCase().includes(search.toLowerCase()),
                )
                .map((s) => ({ value: s.value, label: s.label ?? s.value, icon: s.icon }));
              if (matched.length === 0) {
                return [{ value: '__not_found__', label: t('sender.skills.notFound'), disabled: true }];
              }
              return matched;
            }}
            onSelect={handleSkillSelect}
            block
          >
            {({ onTrigger, onKeyDown }) => {
              skillTriggerRef.current = onTrigger;
              return renderSender({ onKeyDown });
            }}
          </Suggestion>
        ) : (
          renderSender()
        )}
      </div>
    </div>
  );
};

export default SenderContainer;
