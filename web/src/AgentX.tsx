import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { isEqual } from 'lodash-es';
import Agent from '@/components/Agent';
import Home from '@/components/Home';
import { AgentStoreProvider, useAgentStore, useAgentStoreApi } from '@/store';
import { AgentMode, type FileItem, type MessageMetadata, type SenderInputValue } from '@/types';
import type { AgentLayoutConfig, AgentSessionConfig, AgentSenderConfig } from '@/types/agentx';
import { changeLanguage, useTranslation } from '@/hooks/useTranslation';
import { useRightPanelSync } from '@/hooks/useRightPanelSync';
import classNames from 'classnames';
import '@/registry/builtin';
import './index.css';
import DeepResearchIcon from '@/assets/svg/labels/deep-research.svg?react';
import CreateImageIcon from '@/assets/svg/labels/create-image.svg?react';
import CreateVideoIcon from '@/assets/svg/labels/create-video.svg?react';
import CanvasIcon from '@/assets/svg/labels/canvas.svg?react';
import { useSyncPropToStore } from './hooks/useSyncPropsToStore';
import {
  AgentxMenuItem,
  AgentxProps,
  FilePreviewConfig,
  MentionConfig,
  RenderMessageMetadata,
  RenderHitlApproval,
} from './types';
import eventBus from '@/utils/eventBus';
import { normalizeSenderInputValue } from '@/utils/mentions';
import InternalFileReader from '@/components/Infra/FileReader';
import InternalCSVViewer from '@/components/Infra/CSVViewer';

const EMPTY_KNOWLEDGE_BASES: NonNullable<AgentxProps['knowledgeBases']> = [];
const EMPTY_TOOL_ITEMS: NonNullable<AgentxProps['tools']> = [];
const EMPTY_MODELS: NonNullable<AgentxProps['models']> = [];
const EMPTY_SENDER_OPTIONS: NonNullable<AgentxProps['senderOptions']> = [];
const EMPTY_CLIENT_TOOL_HANDLERS: NonNullable<AgentxProps['clientToolHandlers']> = {};
const DEFAULT_INSTANCE_KEY = 'agent-default';

const DEFAULT_LAYOUT_CONFIG: Required<AgentLayoutConfig> = {
  showWorkspace: true,
  showHomePage: true,
  narrowMode: false,
  headerPosition: 'outer',
};

const DEFAULT_SESSION_CONFIG: Required<AgentSessionConfig> = {
  enableRouting: true,
  enableSessionLoading: false,
  autoRetryOnArchive: false,
  enableFeedback: false,
};

const buildDefaultMenuItems = (t: (key: string) => string) => {
  return [
    { key: 'deep_research', label: t('menu.deep_research'), icon: <DeepResearchIcon /> },
    { key: 'create_image', label: t('menu.create_image'), icon: <CreateImageIcon /> },
    { key: 'create_video', label: t('menu.create_video'), icon: <CreateVideoIcon /> },
    { key: 'canvas', label: t('menu.canvas'), icon: <CanvasIcon /> },
  ] as AgentxMenuItem[];
};

export interface AgentXHandle<TMetadata extends MessageMetadata<any> = MessageMetadata> {
  /**
   * Set input text. String, or `{ content, mentions }` for mention tags.
   */
  setInputText: (value: string | SenderInputValue) => void;
  /**
   * Set input content (optional mentions); same as `setInputText`.
   */
  setInput: (value: string | SenderInputValue) => void;
  /**
   * Send a message (same as typing and clicking send)
   * No-op when previewConfig.inputDisabled is true
   */
  send: (content: string) => void;
  /**
   * Set metadata for the next outgoing message, e.g. citation cards.
   */
  setMetadata: (metadata?: TMetadata) => void;
  /**
   * Set input attachments. Array replaces; updater mutates the current list.
   */
  setSenderFiles: (files: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  /**
   * Focus the input.
   */
  focus: () => void;
}

type AgentXComponent = <TMetadata extends MessageMetadata<any> = MessageMetadata>(
  props: AgentxProps<TMetadata> & React.RefAttributes<AgentXHandle<TMetadata>>,
) => React.ReactElement | null;

const AgentXComponentImpl = <TMetadata extends MessageMetadata<any> = MessageMetadata>(
  props: AgentxProps<TMetadata>,
  ref: React.ForwardedRef<AgentXHandle<TMetadata>>,
) => {
  const { agentId = '', displayMode = 'page', instanceKey: instanceKeyProp } = props;
  const innerRef = useRef<AgentXHandle<TMetadata>>(null);

  // Reuse by agentId so /chat/:agentId and /chat/:agentId/:sessionId share state.
  // Host can pass instanceKey to isolate multiple AgentX with the same agentId.
  const instanceKey = instanceKeyProp || (agentId ? `agent-${agentId}` : DEFAULT_INSTANCE_KEY);

  useImperativeHandle(ref, () => ({
    setInputText: (value) => {
      innerRef.current?.setInputText(value);
    },
    setInput: (value) => {
      innerRef.current?.setInput(value);
    },
    send: (content: string) => {
      innerRef.current?.send(content);
    },
    setMetadata: (metadata?: TMetadata) => {
      innerRef.current?.setMetadata(metadata);
    },
    setSenderFiles: (files) => {
      innerRef.current?.setSenderFiles(files);
    },
    focus: () => {
      innerRef.current?.focus();
    },
  }));

  return (
    <AgentStoreProvider instanceKey={instanceKey} displayMode={displayMode} agentId={agentId}>
      <AgentXInner ref={innerRef} {...props} />
    </AgentStoreProvider>
  );
};

const AgentX = forwardRef(AgentXComponentImpl) as AgentXComponent;

// Inner component; uses the store from context
const AgentXInnerComponent = <TMetadata extends MessageMetadata<any> = MessageMetadata>(
  props: AgentxProps<TMetadata>,
  ref: React.ForwardedRef<AgentXHandle<TMetadata>>,
) => {
  const { t } = useTranslation();
  const {
    agentId = '',
    displayMode = 'page',
    sessionId,
    sessionMode,
    shareId,
    sharePassword,
    basePath,
    headerNode,
    footerNode,
    shareButtonNode,
    backButtonNode,
    knowledgeBases = EMPTY_KNOWLEDGE_BASES,
    tools = EMPTY_TOOL_ITEMS,
    models = EMPTY_MODELS,
    selectedModels,
    selectedKnowledgeBases,
    extraHeaders,
    requestAdapter,
    requestCapabilities,
    requestPrefix,
    language,
    senderContent,
    senderFilesConfig,
    fileUploadConfig,
    senderMetadata,
    renderMessageMetadata,
    renderHitlApproval,
    mentionConfig,
    className,
    classNames: slotClassNames,
    styles: slotStyles,
    homeClassName,
    homeContentClassName,
    homeSenderClassName,
    knowledgeReadonly,
    toolReadonly,
    fileUploadDisabled,
    filePreviewConfig,
    traceConfig,
    layoutConfig: layoutConfigProp,
    sessionConfig: sessionConfigProp,
    senderConfig: senderConfigProp,
    previewConfig,
    welcomeScreen,
    startScreen,
    previewScreen,
    menuItems,
    showSenderActions = false,
    placeholder,
    chatEndpoint = '/api/v1/chat',
    onChunks,
    onNewMessage,
    onSessionInfoChange,
    onToolsUpdate,
    onStopped,
    senderOptions = EMPTY_SENDER_OPTIONS,
    clientToolHandlers,
    onToolResult,
    onSessionLoaded,
    autoOpenRightPanel = true,
    disableWorkspaceRendering = false,
    fullscreenFilePreview = false,
    onSessionCreated,
    onManageSkills,
  } = props;

  const resolvedLayoutConfig = useMemo<Required<AgentLayoutConfig>>(
    () => ({
      ...DEFAULT_LAYOUT_CONFIG,
      ...(displayMode === 'embedded' ? { showHomePage: false } : {}),
      ...layoutConfigProp,
    }),
    [displayMode, layoutConfigProp],
  );
  const resolvedSessionConfig = useMemo<Required<AgentSessionConfig>>(
    () => ({
      ...DEFAULT_SESSION_CONFIG,
      ...(displayMode === 'embedded' ? { enableRouting: false, autoRetryOnArchive: true } : {}),
      ...sessionConfigProp,
    }),
    [displayMode, sessionConfigProp],
  );
  // senderConfig: merge deprecated send-control fields from previewConfig
  const resolvedSenderConfig = useMemo<AgentSenderConfig>(
    () => ({
      inputDisabled: previewConfig?.inputDisabled,
      sendDisabled: previewConfig?.sendDisabled,
      sendDisabledTooltip: previewConfig?.sendDisabledTooltip,
      ...senderConfigProp,
    }),
    [previewConfig, senderConfigProp],
  );
  const requestConfig = useMemo(
    () => ({
      extraHeaders: extraHeaders ?? {},
      adapter: requestAdapter,
      capabilities: requestCapabilities,
    }),
    [extraHeaders, requestAdapter, requestCapabilities],
  );
  const resolvedSenderFilesConfig = useMemo(
    () => ({
      ...senderFilesConfig,
      ...(fileUploadConfig
        ? {
            accept: fileUploadConfig.accept,
            maxLength: fileUploadConfig.maxCount,
            maxSize: fileUploadConfig.maxSize,
            multiple: fileUploadConfig.multiple,
            customUploadRequest: fileUploadConfig.customUploadRequest,
          }
        : {}),
    }),
    [fileUploadConfig, senderFilesConfig],
  );

  const defaultMenuItems = useMemo(() => buildDefaultMenuItems(t), [t]);
  const resolvedMenuItems = useMemo(() => {
    if (!menuItems) {
      return defaultMenuItems;
    }

    if (menuItems.every((item) => typeof item === 'string')) {
      const defaultMenuItemMap = new Map(defaultMenuItems.map((item) => [item.key, item]));
      return menuItems
        .map((key) => defaultMenuItemMap.get(key))
        .filter((item): item is AgentxMenuItem => Boolean(item));
    }

    return defaultMenuItems;
  }, [defaultMenuItems, menuItems]);

  const storeApi = useAgentStoreApi();

  useImperativeHandle(ref, () => {
    const applySenderInput = (value: string | SenderInputValue) => {
      const input = normalizeSenderInputValue(value);
      const { instanceId, setSenderContent, setSenderMentions } = storeApi.getState();
      setSenderContent(input.content);
      setSenderMentions(input.mentions ?? []);
      eventBus.emit(`set_sender_input_${instanceId}`, input);
    };

    return {
      setInputText: applySenderInput,
      setInput: applySenderInput,
      send: (content: string) => {
        const { senderConfig: currentSenderConfig, instanceId, senderMetadata, setSenderMetadata } =
          storeApi.getState();
        if (currentSenderConfig?.inputDisabled) return;
        eventBus.emit(`call_send_${instanceId}`, {
          content,
          ...(senderMetadata !== undefined && { metadata: senderMetadata }),
        });
        setSenderMetadata(undefined);
      },
      setMetadata: (metadata?: TMetadata) => {
        storeApi.getState().setSenderMetadata(metadata as MessageMetadata | undefined);
      },
      setSenderFiles: (files) => {
        storeApi.getState().setSenderFiles(files);
      },
      focus: () => {
        const { instanceId } = storeApi.getState();
        eventBus.emit(`focus_sender_${instanceId}`);
      },
    };
  });

  const { sessionId: sessionIdStore } = useAgentStore();
  const resolvedSessionId = sessionId || sessionIdStore;
  // Sync props into the store
  useSyncPropToStore(storeApi, resolvedLayoutConfig, 'setLayoutConfig');
  useSyncPropToStore(storeApi, resolvedSessionConfig, 'setSessionConfig');
  useSyncPropToStore(storeApi, resolvedSenderConfig, 'setSenderConfig');
  useSyncPropToStore(storeApi, displayMode, 'setDisplayMode');

  useSyncPropToStore(storeApi, basePath ?? '', 'setBasePath');
  useSyncPropToStore(storeApi, agentId, 'setAgentId');
  useSyncPropToStore(storeApi, sessionId ?? '', 'setSessionId');
  useSyncPropToStore(storeApi, displayMode === 'embedded' ? sessionId ?? null : null, 'setEmbeddedSessionId');

  useSyncPropToStore(storeApi, shareId, 'setShareId', { resetValue: '' });
  useSyncPropToStore(storeApi, sharePassword, 'setSharePassword', { resetValue: '' });
  useSyncPropToStore(storeApi, shareId ? AgentMode.Replay : AgentMode.Chatbot, 'setMode', {
    resetValue: AgentMode.Chatbot,
  });
  useSyncPropToStore(storeApi, models, 'setSenderModels');

  useSyncPropToStore(storeApi, tools, 'setSenderTools');

  useSyncPropToStore(storeApi, knowledgeReadonly, 'setKnowledgeReadonly');
  useSyncPropToStore(storeApi, toolReadonly, 'setToolReadonly');
  useSyncPropToStore(storeApi, fileUploadDisabled, 'setFileUploadDisabled');
  useSyncPropToStore(storeApi, filePreviewConfig, 'setFilePreviewConfig');
  useSyncPropToStore(storeApi, traceConfig, 'setTraceConfig');
  useSyncPropToStore(storeApi, placeholder, 'setPlaceholder');
  useSyncPropToStore(storeApi, sessionMode, 'setSessionMode');
  useSyncPropToStore(storeApi, onChunks, 'setOnChunks');
  useSyncPropToStore(storeApi, onNewMessage, 'setOnNewMessage');
  useSyncPropToStore(storeApi, onSessionInfoChange, 'setOnSessionInfoChange');
  useSyncPropToStore(storeApi, onToolsUpdate, 'setOnToolsUpdate');
  useSyncPropToStore(storeApi, chatEndpoint, 'setChatEndpoint');
  useSyncPropToStore(storeApi, extraHeaders ?? {}, 'setExtraHeaders');
  useSyncPropToStore(storeApi, requestConfig, 'setRequestConfig');
  useSyncPropToStore(storeApi, fileUploadConfig ?? {}, 'setFileUploadConfig');
  useSyncPropToStore(storeApi, clientToolHandlers ?? EMPTY_CLIENT_TOOL_HANDLERS, 'setClientToolHandlers');
  useSyncPropToStore(storeApi, onToolResult, 'setOnToolResult');
  useSyncPropToStore(storeApi, onSessionLoaded, 'setOnSessionLoaded');
  useSyncPropToStore(storeApi, onStopped, 'setOnStopped');
  useSyncPropToStore(storeApi, senderOptions, 'setSenderOptionsConfig');
  useSyncPropToStore(storeApi, senderMetadata as MessageMetadata | undefined, 'setSenderMetadata');
  useSyncPropToStore(
    storeApi,
    renderMessageMetadata as RenderMessageMetadata | undefined,
    'setRenderMessageMetadata',
  );
  useSyncPropToStore(
    storeApi,
    renderHitlApproval as RenderHitlApproval | undefined,
    'setRenderHitlApproval',
  );
  useSyncPropToStore(storeApi, mentionConfig as MentionConfig | undefined, 'setMentionConfig');
  useSyncPropToStore(storeApi, autoOpenRightPanel, 'setAutoOpenRightPanel');
  useSyncPropToStore(storeApi, showSenderActions, 'setShowSenderActions');
  useSyncPropToStore(storeApi, disableWorkspaceRendering, 'setDisableWorkspaceRendering');
  useSyncPropToStore(storeApi, fullscreenFilePreview, 'setFullscreenFilePreview');
  useSyncPropToStore(storeApi, onSessionCreated, 'setOnSessionCreated');
  useSyncPropToStore(storeApi, onManageSkills, 'setOnManageSkills');

  useEffect(() => {
    const { senderKnowledgeBases, setSenderKnowledgeBases } = storeApi.getState();
    if (!isEqual(senderKnowledgeBases, knowledgeBases)) {
      setSenderKnowledgeBases(knowledgeBases);
    }
  }, [knowledgeBases, storeApi]);

  useEffect(() => {
    if (
      (!resolvedSessionId || resolvedSenderConfig.syncSelectedResourcesOnSession) &&
      Array.isArray(selectedKnowledgeBases) &&
      knowledgeBases.length
    ) {
      const selectedItems = knowledgeBases.filter((item) => selectedKnowledgeBases.includes(item.knowledge_id));
      const { selectedSenderKnowledgeBases, setSelectedSenderKnowledgeBases } = storeApi.getState();
      if (!isEqual(selectedSenderKnowledgeBases, selectedItems)) {
        setSelectedSenderKnowledgeBases(selectedItems);
      }
    }

    return () => {
      // storeApi.getState().setSelectedSenderKnowledgeBases([]);
    };
  }, [
    resolvedSessionId,
    resolvedSenderConfig.syncSelectedResourcesOnSession,
    selectedKnowledgeBases,
    knowledgeBases,
    storeApi,
  ]);

  useEffect(() => {
    const { selectedSenderModels, setSelectedSenderModels } = storeApi.getState();

    if (Array.isArray(selectedModels) && models.length) {
      const selectedItems = models.filter((item) => selectedModels.includes(item.id));
      if (!isEqual(selectedSenderModels, selectedItems)) {
        setSelectedSenderModels(selectedItems);
      }
    } else {
      // Clear selected models when no models are available
      if (selectedSenderModels.length) {
        setSelectedSenderModels([]);
      }
    }

    return () => {
      // storeApi.getState().setSelectedSenderModels([]);
    };
  }, [selectedModels, models, storeApi]);

  useEffect(() => {
    if (language) {
      changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    const { setSenderContent, setSenderMentions, instanceId } = storeApi.getState();
    if (typeof senderContent === 'string') {
      setSenderContent(senderContent);
      setSenderMentions([]);
      eventBus.emit(`set_sender_input_${instanceId}`, { content: senderContent, mentions: [] });
    }

    return () => {
      storeApi.getState().setSenderContent('');
      storeApi.getState().setSenderMentions([]);
    };
  }, [senderContent, storeApi]);

  useEffect(() => {
    const { setSenderFilesConfig } = storeApi.getState();
    if (senderFilesConfig || fileUploadConfig) {
      setSenderFilesConfig(resolvedSenderFilesConfig);
    }
    return () => {
      storeApi.getState().setSenderFilesConfig({
        senderFiles: [],
        maxLength: 10,
        Button: null,
        accept: '',
        onRemove: undefined,
        beforeUpload: undefined,
      });
    };
  }, [fileUploadConfig, resolvedSenderFilesConfig, senderFilesConfig, storeApi]);

  // Sync the right panel via useRightPanelSync
  useRightPanelSync({ previewConfig, storeApi });

  return (
    <div
      className={classNames(
        'w-full overflow-hidden',
        displayMode === 'embedded' ? 'h-full' : 'h-screen',
        className,
      )}
    >
      {(() => {
        // Page mode without a session: show Home
        if (
          displayMode === 'page' &&
          resolvedLayoutConfig.showHomePage &&
          !resolvedSessionId &&
          !shareId &&
          !previewScreen &&
          !welcomeScreen
        ) {
          return (
            <Home
              headerNode={headerNode}
              footerNode={footerNode}
              menuItems={resolvedMenuItems}
              showSenderActions={showSenderActions}
              homeClassName={homeClassName}
              homeContentClassName={homeContentClassName}
              homeSenderClassName={homeSenderClassName}
            />
          );
        }

        // Shared Agent props
        const agentProps = {
          basePath,
          agentId,
          sessionId: resolvedSessionId,
          shareButtonNode,
          backButtonNode,
          welcomeScreen,
          startScreen,
          previewScreen,
          previewConfig,
          menuItems: resolvedMenuItems,
          showSenderActions,
          headerNode,
          classNames: slotClassNames,
          styles: slotStyles,
        };

        return <Agent {...agentProps} />;
      })()}
    </div>
  );
};

const AgentXInner = forwardRef(AgentXInnerComponent) as AgentXComponent;

export interface FileReaderProps {
  url: string;
  filename?: string;
  contentType?: string;
  filePreviewConfig?: FilePreviewConfig;
}

export interface CSVViewerProps {
  content: string;
}

export const FileReader = (props: FileReaderProps) => <InternalFileReader {...props} />;

export { canPreviewFile } from '@/utils/filePreview';
export type { CanPreviewFileOptions } from '@/utils/filePreview';

export const CSVViewer = (props: CSVViewerProps) => <InternalCSVViewer {...props} />;

export type { PreviewScreenProps, PreviewScreenPrompt } from '@/components/Agent/Chatbot/PreviewScreen';
export * from '@/types';
export {
  AgentStoreProvider,
  useAgentStore,
  useAgentStoreApi,
  useAgentStoreDefault,
} from '@/store';
export { default as messageTypeRegistry } from '@/registry';

export default AgentX;

export * from '@/sdk';
