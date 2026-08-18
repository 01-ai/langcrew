import { Sender } from '@ant-design/x';
import type { SenderRef, SlotConfigType } from '@ant-design/x/es/sender/interface';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore, useAgentStoreApi } from '@/store';
import useChat from '@/hooks/useChat';
import { FileList, SenderFooter } from '@/components/Agent/Chatbot/Sender/components';
import MessageMetadataRenderer from '@/components/Agent/Chatbot/MessageMetadataRenderer';
import type { Mention, SenderInputValue, SenderOptionConfig } from '@/types';
import DisabledSender from './DisabledSender';
import { useSenderSubmit, MAX_CONTENT_LENGTH } from './hooks/useSenderSubmit';
import { useSenderFileHandlers } from './hooks/useSenderFileHandlers';
import { useSenderSessionSync } from './hooks/useSenderSessionSync';
import { normalizeSenderOptionValues } from './utils/senderOptions';
import eventBus from '@/utils/eventBus';
import {
  buildMentionToken,
  contentAndMentionsToSlots,
  normalizeSenderInputValue,
  removeMentionFromInput,
  slotConfigToMentions,
} from '@/utils/mentions';
import MentionInteractive from '@/components/Mentions/MentionInteractive';
import classNames from 'classnames';
import { hasActiveHitlApprovalRequest } from '@/hooks/useChat/utils';
import './index.less';

/** Stable empty slotConfig enables Sender slot mode without resetting on every render. */
const EMPTY_SLOT_CONFIG: SlotConfigType[] = [];

/** Trailing `@query` in the composer opens the tool/skills menu. */
const AT_TRIGGER_REGEXP = /(^|[\s\n])@([^\s@:]*)$/;

interface SenderMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
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
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [toolMenuQuery, setToolMenuQuery] = useState<string | undefined>(undefined);
  const toolMenuSourceRef = useRef<'button' | 'at'>('button');
  const isDeepResearch = location.search.includes('kw=deepresearch');

  const {
    basePath: storeBasePath,
    agentId: storeAgentId,
    sessionId: storeSessionId,
    sessionInfo,
    senderLoading,
    senderContent,
    setSenderContent,
    senderMentions,
    setSenderMentions,
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
    senderTools,
    senderStopping,
    senderSending,
    knowledgeReadonly,
    toolReadonly,
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
    onManageSkills,
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
  const headerOpen = senderFiles.length > 0;
  const sessionActive = sessionInfo?.status !== 'ARCHIVED';
  const latestPipelineMessage = pipelineMessages[pipelineMessages.length - 1];
  const pendingHitlApproval = hasActiveHitlApprovalRequest(latestPipelineMessage);
  const senderDisabled = !sessionActive || !!senderConfig?.inputDisabled || pendingHitlApproval;
  const uploadDisabled = fileUploadDisabled || !!senderConfig?.inputDisabled || pendingHitlApproval;
  const isSingleLineInput = senderConfig?.inputMode === 'singleLine';
  const senderAutoSize = isSingleLineInput ? { minRows: 1, maxRows: 15 } : { minRows: 2, maxRows: 15 };
  const menuItems = useMemo(() => propsMenuItems || [], [propsMenuItems]);
  const tools = senderTools || [];
  const applyingComposerRef = useRef(false);
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

  const applyInputToEditor = useCallback((value: string | SenderInputValue) => {
    const input = normalizeSenderInputValue(value);
    const editor = senderRef.current;
    if (!editor) return;

    editor.clear?.();
    // clear() removes selection ranges; refocus so subsequent insert('start') can resolve a range.
    editor.focus?.({ cursor: 'start', preventScroll: true });
    const slots = contentAndMentionsToSlots(input.content, input.mentions ?? [], {
      renderLabel: (mention) => <MentionInteractive mention={mention} variant="draft" />,
    });
    if (slots.length > 0) {
      editor.insert?.(slots, 'start');
    }
  }, []);

  const readComposerValue = useCallback(() => {
    const editorValue = senderRef.current?.getValue?.();
    const { senderContent: content, senderMentions: mentions } = storeApi.getState();
    return {
      content: editorValue?.value ?? content,
      mentions: editorValue?.slotConfig ? slotConfigToMentions(editorValue.slotConfig) : mentions,
    };
  }, [storeApi]);

  const applyComposerValue = useCallback(
    (next: SenderInputValue) => {
      const mentions = next.mentions ?? [];
      applyingComposerRef.current = true;
      setSenderContent(next.content);
      setSenderMentions(mentions);
      applyInputToEditor(next);
      applyingComposerRef.current = false;
    },
    [applyInputToEditor, setSenderContent, setSenderMentions],
  );

  const removeMention = useCallback(
    (mention: Mention) => {
      const current = readComposerValue();
      applyComposerValue(removeMentionFromInput(current.content, current.mentions, mention));
    },
    [applyComposerValue, readComposerValue],
  );

  useEffect(() => {
    const handleSetInput = (value: string | SenderInputValue) => {
      applyComposerValue(normalizeSenderInputValue(value));
    };

    const handleAppendText = (text: string) => {
      if (!text) return;
      senderRef.current?.insert?.([{ type: 'text', value: text }], 'end');
    };

    eventBus.on(`set_sender_input_${instanceId}`, handleSetInput);
    eventBus.on(`append_sender_text_${instanceId}`, handleAppendText);
    eventBus.on(`remove_sender_mention_${instanceId}`, removeMention);
    return () => {
      eventBus.off(`set_sender_input_${instanceId}`, handleSetInput);
      eventBus.off(`append_sender_text_${instanceId}`, handleAppendText);
      eventBus.off(`remove_sender_mention_${instanceId}`, removeMention);
    };
  }, [applyComposerValue, instanceId, removeMention]);

  // Apply store content once after slot editor mounts (e.g. prop-prefilled senderContent).
  useEffect(() => {
    const { senderContent: content, senderMentions: mentions } = storeApi.getState();
    if (content || mentions.length > 0) {
      applyInputToEditor({ content, mentions });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
  }, []);

  const clearState = useCallback(() => {
    setSenderContent('');
    setSenderMentions([]);
    setSenderFiles([]);
    setSenderMetadata(undefined);
    senderRef.current?.clear?.();
  }, [setSenderContent, setSenderMentions, setSenderFiles, setSenderMetadata]);

  const handleSenderChange = useCallback(
    (value: string, _event?: unknown, nextSlotConfig?: SlotConfigType[]) => {
      if (applyingComposerRef.current) return;

      const mentions = slotConfigToMentions(nextSlotConfig ?? []);
      setSenderContent(value);
      setSenderMentions(mentions);

      const canOpenToolMenu =
        showSenderActions &&
        !senderDisabled &&
        (menuItems.length > 0 || tools.length > 0);
      const match = AT_TRIGGER_REGEXP.exec(value);
      if (canOpenToolMenu && match) {
        toolMenuSourceRef.current = 'at';
        setToolMenuQuery(match[2] ?? '');
        setToolMenuOpen(true);
        return;
      }

      if (toolMenuSourceRef.current === 'at') {
        toolMenuSourceRef.current = 'button';
        setToolMenuQuery(undefined);
        setToolMenuOpen(false);
      }
    },
    [
      menuItems.length,
      senderDisabled,
      setSenderContent,
      setSenderMentions,
      showSenderActions,
      tools.length,
    ],
  );

  const handleToolMenuOpenChange = useCallback((nextOpen: boolean) => {
    setToolMenuOpen(nextOpen);
    if (nextOpen) {
      if (toolMenuSourceRef.current !== 'at') {
        toolMenuSourceRef.current = 'button';
        setToolMenuQuery(undefined);
      }
      return;
    }

    toolMenuSourceRef.current = 'button';
    setToolMenuQuery(undefined);
  }, []);

  const consumeAtTrigger = useCallback(() => {
    const { content, mentions } = readComposerValue();
    const match = AT_TRIGGER_REGEXP.exec(content);
    if (!match) return;

    toolMenuSourceRef.current = 'button';
    setToolMenuQuery(undefined);
    applyComposerValue({
      content: `${content.slice(0, match.index)}${match[1] || ''}`,
      mentions,
    });
  }, [applyComposerValue, readComposerValue]);

  const insertMention = useCallback(
    (mention: Mention) => {
      const { content, mentions } = readComposerValue();
      const token = mention.token || buildMentionToken(mention.type, mention.id);
      const nextMention: Mention = { ...mention, token };
      const already = mentions.some((item) => item.type === mention.type && item.id === mention.id);
      const match = AT_TRIGGER_REGEXP.exec(content);

      if (already) {
        if (match) {
          toolMenuSourceRef.current = 'button';
          setToolMenuQuery(undefined);
          setToolMenuOpen(false);
          applyComposerValue({
            content: `${content.slice(0, match.index)}${match[1] || ''}`,
            mentions,
          });
        }
        return;
      }

      let nextContent: string;
      if (match) {
        nextContent = `${content.slice(0, match.index)}${match[1] || ''}${token} `;
        toolMenuSourceRef.current = 'button';
        setToolMenuQuery(undefined);
        setToolMenuOpen(false);
      } else {
        const prefix = content && !/\s$/.test(content) ? ' ' : '';
        nextContent = `${content}${prefix}${token} `;
      }

      applyComposerValue({ content: nextContent, mentions: [...mentions, nextMention] });
    },
    [applyComposerValue, readComposerValue],
  );

  const handleSelectedSceneChange = useCallback(
    (scene: string | null) => {
      setSelectedScene(scene);
      if (scene) consumeAtTrigger();
    },
    [consumeAtTrigger],
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
    senderModels,
    selectedSenderModels,
    setSelectedSenderModels,
    storeApi,
  });

  const { handleSend, isSendDisabled } = useSenderSubmit({
    senderContent,
    senderMentions,
    senderFiles,
    senderMetadata,
    senderLoading,
    previewSendDisabled: senderConfig?.sendDisabled,
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
  });

  const handleSenderSubmit = useCallback(
    (message?: string, nextSlotConfig?: SlotConfigType[]) => {
      if (toolMenuOpen) return;
      handleSend(message, nextSlotConfig);
    },
    [handleSend, toolMenuOpen],
  );

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

  const renderSender = () => (
    <Sender
      ref={senderRef}
      slotConfig={EMPTY_SLOT_CONFIG}
      disabled={senderDisabled}
      autoSize={senderAutoSize}
      placeholder={placeholder || t('sender.placeholder')}
      onChange={handleSenderChange}
      onSubmit={handleSenderSubmit}
      onPasteFile={uploadDisabled ? undefined : handlePaste}
      suffix={false}
      header={headerNode}
      footer={(_, { components }) => {
        // Delegate all footer rendering/interaction wiring to presentation component,
        // while ChatSender stays as an orchestration container.
        return (
          <SenderFooter
            state={{
              senderDisabled,
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
              onKnowledgeBaseOpenChange: setKnowledgeBaseOpen,
              onSelectedSceneChange: handleSelectedSceneChange,
              onClearKnowledgeBases: handleClearKnowledgeBases,
              hasTools: tools.length > 0,
              tools,
              toolMenuOpen,
              onToolMenuOpenChange: handleToolMenuOpenChange,
              toolMenuQuery,
              onPickMention: insertMention,
              onRemoveMention: removeMention,
              onManageSkills,
              toolReadonly,
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
          // 2026-05-21: drop file-type restrictions
          // accept={senderFilesConfig.accept || ALLOWED_FILES}
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length > 0) {
              handlePaste(files);
            }
            event.target.value = '';
          }}
        />

        {renderSender()}
      </div>
    </div>
  );
};

export default SenderContainer;
