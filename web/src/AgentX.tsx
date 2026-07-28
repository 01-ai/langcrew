import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { isEqual } from 'lodash-es';
import Agent from '@/components/Agent';
import Home from '@/components/Home';
import { AgentStoreProvider, useAgentStore, useAgentStoreApi } from '@/store';
import { AgentMode, type FileItem, type MessageMetadata } from '@/types';
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
  RenderMessageMetadata,
  RenderHitlApproval,
} from './types';
import eventBus from '@/utils/eventBus';
import './antd-override.less';
import InternalFileReader from '@/components/Infra/FileReader';
import InternalCSVViewer from '@/components/Infra/CSVViewer';

const EMPTY_KNOWLEDGE_BASES: NonNullable<AgentxProps['knowledgeBases']> = [];
const EMPTY_TOOL_ITEMS: NonNullable<AgentxProps['mcpTools']> = [];
const EMPTY_MODELS: NonNullable<AgentxProps['models']> = [];
const EMPTY_SENDER_OPTIONS: NonNullable<AgentxProps['senderOptions']> = [];
const EMPTY_CLIENT_TOOL_HANDLERS: NonNullable<AgentxProps['clientToolHandlers']> = {};

/** displayMode Preset: Default for each mode config Value */
const DISPLAY_MODE_PRESETS: Record<
  'page' | 'embedded' | 'preview',
  { layout: Required<AgentLayoutConfig>; session: Required<AgentSessionConfig> }
> = {
  page: {
    layout: { showWorkspace: true, showHomePage: true, narrowMode: false, headerPosition: 'outer' },
    session: { enableRouting: true, enableSessionLoading: true, autoRetryOnArchive: false },
  },
  embedded: {
    layout: { showWorkspace: false, showHomePage: false, narrowMode: true, headerPosition: 'outer' },
    session: { enableRouting: false, enableSessionLoading: false, autoRetryOnArchive: true },
  },
  preview: {
    layout: { showWorkspace: true, showHomePage: false, narrowMode: false, headerPosition: 'inner' },
    session: { enableRouting: false, enableSessionLoading: false, autoRetryOnArchive: false },
  },
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
   * Set text content for the input box
   */
  setInputText: (text: string) => void;
  /**
   * Send a message directly (as if you click to send after user input)
   * Yes. previewConfig.inputDisabled Protect, call invalid when disabled
   */
  send: (content: string) => void;
  /**
   * Set the next message to send metadata，For example, the reference card.
   */
  setMetadata: (metadata?: TMetadata) => void;
  /**
   * Sets the list of input box attachments. The intake arrays will be replaced as a whole, and they will be entered updater function is updated on the current list.
   */
  setSenderFiles: (files: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  /**
   * Focus input box.
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
  const { displayMode = 'page', agentId, instanceKey: instanceKeyProp } = props;
  const innerRef = useRef<AgentXHandle<TMetadata>>(null);

  // Default Press agentId Reuse the example to ensure that /chat/:agentId and /chat/:agentId/:sessionId Share status.
  // Hosts can be imported. instanceKey To isolate the same. agentId、Same displayMode Multiple AgentX。
  const instanceKey = instanceKeyProp || `agent-${agentId}`;

  useImperativeHandle(ref, () => ({
    setInputText: (text: string) => {
      innerRef.current?.setInputText(text);
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
    <AgentStoreProvider instanceKey={instanceKey} agentId={agentId}>
      <AgentXInner ref={innerRef} {...props} />
    </AgentStoreProvider>
  );
};

const AgentX = forwardRef(AgentXComponentImpl) as AgentXComponent;

// Internal component, use context Medium store
const AgentXInnerComponent = <TMetadata extends MessageMetadata<any> = MessageMetadata>(
  props: AgentxProps<TMetadata>,
  ref: React.ForwardedRef<AgentXHandle<TMetadata>>,
) => {
  const { t } = useTranslation();
  const {
    agentId,
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
    mcpTools = EMPTY_TOOL_ITEMS,
    sandboxTools = EMPTY_TOOL_ITEMS,
    pluginTools = EMPTY_TOOL_ITEMS,
    workflowTools = EMPTY_TOOL_ITEMS,
    skillTools = EMPTY_TOOL_ITEMS,
    models = EMPTY_MODELS,
    selectedModels,
    selectedTools,
    selectedKnowledgeBases,
    extraHeaders,
    requestPrefix,
    language,
    senderContent,
    senderFilesConfig,
    senderMetadata,
    renderMessageMetadata,
    renderHitlApproval,
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
    displayMode = 'page',
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
    chatEndpoint,
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
  } = props;

  // Calculate resolved Configure:preset Default value + Visible. config Overwrite
  const preset = DISPLAY_MODE_PRESETS[displayMode];
  const resolvedLayoutConfig = useMemo<Required<AgentLayoutConfig>>(
    () => ({ ...preset.layout, ...layoutConfigProp }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayMode, layoutConfigProp],
  );
  const resolvedSessionConfig = useMemo<Required<AgentSessionConfig>>(
    () => ({ ...preset.session, ...sessionConfigProp }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayMode, sessionConfigProp],
  );
  // senderConfig：Merge previewConfig Medium deprecated Send Control Fields
  const resolvedSenderConfig = useMemo<AgentSenderConfig>(
    () => ({
      inputDisabled: previewConfig?.inputDisabled,
      sendDisabled: previewConfig?.sendDisabled,
      sendDisabledTooltip: previewConfig?.sendDisabledTooltip,
      ...senderConfigProp,
    }),
    [previewConfig, senderConfigProp],
  );
  const requestConfig = useMemo(() => ({ extraHeaders: extraHeaders || {} }), [extraHeaders]);

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

  useImperativeHandle(ref, () => ({
    setInputText: (text: string) => {
      storeApi.getState().setSenderContent(text);
    },
    send: (content: string) => {
      const { senderConfig: currentSenderConfig, instanceId, senderMetadata, setSenderMetadata } = storeApi.getState();
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
  }));

  const { sessionId: sessionIdStore } = useAgentStore();
  const resolvedSessionId = sessionId || sessionIdStore;
  // Sync props Present. store
  useSyncPropToStore(storeApi, resolvedLayoutConfig, 'setLayoutConfig');
  useSyncPropToStore(storeApi, resolvedSessionConfig, 'setSessionConfig');
  useSyncPropToStore(storeApi, resolvedSenderConfig, 'setSenderConfig');

  useSyncPropToStore(storeApi, basePath, 'setBasePath');
  useSyncPropToStore(storeApi, agentId, 'setAgentId');
  useSyncPropToStore(storeApi, sessionId || null, 'setSessionId');

  useSyncPropToStore(storeApi, shareId, 'setShareId', { resetValue: '' });
  useSyncPropToStore(storeApi, sharePassword, 'setSharePassword', { resetValue: '' });
  useSyncPropToStore(storeApi, shareId ? AgentMode.Replay : AgentMode.Chatbot, 'setMode', {
    resetValue: AgentMode.Chatbot,
  });
  useSyncPropToStore(storeApi, models, 'setSenderModels');

  useSyncPropToStore(storeApi, mcpTools, 'setSenderMCPTools');

  useSyncPropToStore(storeApi, sandboxTools, 'setSenderSandboxTools');

  useSyncPropToStore(storeApi, pluginTools, 'setSenderPluginTools');
  useSyncPropToStore(storeApi, workflowTools, 'setSenderWorkflowTools');
  useSyncPropToStore(storeApi, skillTools, 'setSenderSkillTools');

  useSyncPropToStore(storeApi, knowledgeReadonly, 'setKnowledgeReadonly');
  useSyncPropToStore(storeApi, toolReadonly, 'setToolReadonly');
  useSyncPropToStore(storeApi, fileUploadDisabled, 'setFileUploadDisabled');
  useSyncPropToStore(storeApi, filePreviewConfig, 'setFilePreviewConfig');
  useSyncPropToStore(storeApi, placeholder, 'setPlaceholder');
  useSyncPropToStore(storeApi, sessionMode, 'setSessionMode');
  useSyncPropToStore(storeApi, onChunks, 'setOnChunks');
  useSyncPropToStore(storeApi, onNewMessage, 'setOnNewMessage');
  useSyncPropToStore(storeApi, onSessionInfoChange, 'setOnSessionInfoChange');
  useSyncPropToStore(storeApi, onToolsUpdate, 'setOnToolsUpdate');
  useSyncPropToStore(storeApi, chatEndpoint, 'setChatEndpoint');
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
  useSyncPropToStore(storeApi, autoOpenRightPanel, 'setAutoOpenRightPanel');
  useSyncPropToStore(storeApi, showSenderActions, 'setShowSenderActions');
  useSyncPropToStore(storeApi, disableWorkspaceRendering, 'setDisableWorkspaceRendering');
  useSyncPropToStore(storeApi, fullscreenFilePreview, 'setFullscreenFilePreview');
  useSyncPropToStore(storeApi, onSessionCreated, 'setOnSessionCreated');
  useSyncPropToStore(storeApi, requestConfig, 'setRequestConfig');

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
    const { selectedSenderMCPTools, setSelectedSenderMCPTools } = storeApi.getState();
    if (
      (!resolvedSessionId || resolvedSenderConfig.syncSelectedResourcesOnSession) &&
      Array.isArray(selectedTools)
    ) {
      const selectedMCPTools = mcpTools.filter((item) => selectedTools.includes(item.agent_tool_id));
      const selectedSandboxTools = sandboxTools.filter((item) => selectedTools.includes(item.agent_tool_id));
      const selectedPluginTools = pluginTools.filter((item) => selectedTools.includes(item.agent_tool_id));
      const selectedWorkflowTools = workflowTools.filter((item) => selectedTools.includes(item.agent_tool_id));
      const selectedSkillTools = skillTools.filter((item) => selectedTools.includes(item.agent_tool_id));

      const selectedItems = [
        ...selectedMCPTools,
        ...selectedSandboxTools,
        ...selectedPluginTools,
        ...selectedWorkflowTools,
        ...selectedSkillTools,
      ];
      if (!isEqual(selectedSenderMCPTools, selectedItems)) {
        setSelectedSenderMCPTools(selectedItems);
      }
    }

    return () => {
      // storeApi.getState().setSelectedSenderMCPTools([]);
    };
  }, [
    resolvedSessionId,
    resolvedSenderConfig.syncSelectedResourcesOnSession,
    selectedTools,
    mcpTools,
    sandboxTools,
    pluginTools,
    workflowTools,
    skillTools,
    storeApi,
  ]);

  useEffect(() => {
    if (language) {
      changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    const { setSenderContent } = storeApi.getState();
    if (typeof senderContent === 'string') {
      setSenderContent(senderContent);
    }

    return () => {
      storeApi.getState().setSenderContent('');
    };
  }, [senderContent, storeApi]);

  useEffect(() => {
    const { setSenderFilesConfig } = storeApi.getState();
    if (senderFilesConfig) {
      setSenderFilesConfig(senderFilesConfig);
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
  }, [senderFilesConfig, storeApi]);

  // Use useRightPanelSync hook Process right panel sync logic
  useRightPanelSync({ previewConfig, storeApi });

  return (
    <div className={classNames('w-full h-full overflow-hidden', className)}>
      {(() => {
        // Page Mode and None session：Show Home Page
        if (resolvedLayoutConfig.showHomePage && !sessionId && !shareId && !previewScreen && !welcomeScreen) {
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

        // Public Agent props
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

export type { KnowledgeBaseItem, MCPToolItem, AgentMode, FileItem } from '@/types';
export type { PreviewScreenProps, PreviewScreenPrompt } from '@/components/Agent/Chatbot/PreviewScreen';

export default AgentX;

export * from '@/sdk';
