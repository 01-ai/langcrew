import { FC } from 'react';
import { createStore } from 'zustand/vanilla';
import {
  TaskStage,
  AgentMode,
  PlanStep,
  FileItem,
  KnowledgeBaseItem,
  MCPToolItem,
  MessageChunk,
  MessageMetadata,
  RenderMessageMetadata,
  RenderHitlApproval,
  SessionInfo,
  E2BFile,
  MessageItem,
  SenderFilesConfig,
  ModelItem,
  CloudPhoneAuthInfo,
  SenderOptionConfig,
  FilePreviewConfig,
  AgentLayoutConfig,
  AgentSessionConfig,
  AgentSenderConfig,
  ToolResultContext,
} from '@/types';
import type { ClientToolHandlers } from '@/sdk/clientTools';
import { isFunction } from 'lodash-es';
import { transformChunksToMessages } from '@/hooks/useChat/transformChunksToMessages';
import { devtools } from 'zustand/middleware';
import { mergeFiles } from '@/utils/file';
import { isMessageFinish } from '@/hooks/useChat/utils';

export interface AgentStore {
  // Store instance ID.
  instanceId: string;
  // Basic Agent information.
  agentId: string;
  setAgentId: (id: string) => void;
  sessionId: string;
  setSessionId: (id: string) => void;
  sessionInfo?: SessionInfo;
  setSessionInfo: (info?: SessionInfo) => void;
  basePath: string;
  setBasePath: (path: string) => void;
  mode: AgentMode;
  setMode: (mode: AgentMode) => void;

  requestConfig: {
    extraHeaders?: Record<string, string>;
  };
  setRequestConfig: (config: Partial<AgentStore['requestConfig']>) => void;

  // Share information.
  shareId: string;
  setShareId: (id: string) => void;
  sharePassword: string;
  setSharePassword: (password: string) => void;

  // Navigation flag used to avoid duplicate data loads after navigate().
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;

  // Agent message data.

  // Main conversation data shown on the left.
  pipelineMessages: MessageItem[];
  setPipelineMessages: (data: MessageItem[]) => void;

  // Message selected in the main conversation.
  pipelineTargetMessage: any;
  setPipelineTargetMessage: (data: any) => void;
  // Workspace sidebar data.
  workspaceMessages: any[];
  setWorkspaceMessages: (data: any[]) => void;

  // Workspace sidebar visibility.
  workspaceVisible: boolean;
  setWorkspaceVisible: (visible: boolean) => void;

  // Agent task state.

  // Task state machine: waiting -> thinking -> planning -> execution -> optional HITL -> success/failure.
  taskStage: TaskStage;
  setTaskStage: (status: TaskStage) => void;

  // Task plan.
  taskPlan: PlanStep[];
  setTaskPlan: (plan: PlanStep[]) => void;

  // Message chunks.
  chunks: MessageChunk[];
  setChunks: (chunks: MessageChunk[] | ((prev: MessageChunk[]) => MessageChunk[])) => void;
  addChunk: (chunk: MessageChunk) => void;
  addChunks: (chunks: MessageChunk[]) => void;
  clearChunks: () => void;

  // Show a loading state while the SSE request is pending.
  senderLoading: boolean;
  setSenderLoading: (loading: boolean) => void;
  // Sender disabled state. Currently unused because sessionInfo.status determines whether sending is allowed.
  // senderDisabled: boolean;
  // setSenderDisabled: (disabled: boolean) => void;
  // Whether the sender is stopping the current task.
  senderStopping: boolean;
  setSenderStopping: (stopping: boolean) => void;
  // Show a sending state while processing data returned by the SSE request.
  senderSending: boolean;
  setSenderSending: (sending: boolean) => void;
  // Sender content.
  senderContent: string;
  setSenderContent: (value: string) => void;
  // Sender files.
  senderFiles: FileItem[];
  setSenderFiles: (file: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  // Message-level sender metadata, such as a quoted card.
  senderMetadata?: MessageMetadata;
  setSenderMetadata: (metadata?: MessageMetadata) => void;
  // Custom renderer for message metadata.
  renderMessageMetadata?: RenderMessageMetadata;
  setRenderMessageMetadata: (renderMessageMetadata?: RenderMessageMetadata) => void;
  renderHitlApproval?: RenderHitlApproval;
  setRenderHitlApproval: (renderHitlApproval?: RenderHitlApproval) => void;
  senderFilesConfig: SenderFilesConfig;
  setSenderFilesConfig: (config: {
    senderFiles?: FileItem[];
    maxLength?: number;
    accept?: string;
    onRemove?: (file?: FileItem) => void;
    beforeUpload?: (fileList: File[], file: File) => boolean;
    Button?: FC<any> | null;
  }) => void;

  // Knowledge bases available in the sender.
  senderKnowledgeBases: KnowledgeBaseItem[];
  setSenderKnowledgeBases: (data: KnowledgeBaseItem[]) => void;
  // Knowledge bases selected in the sender.
  selectedSenderKnowledgeBases: KnowledgeBaseItem[];
  setSelectedSenderKnowledgeBases: (data: KnowledgeBaseItem[]) => void;
  // MCP tools available in the sender.
  senderMCPTools: MCPToolItem[];
  setSenderMCPTools: (data: MCPToolItem[]) => void;
  // Sandbox tools available in the sender.
  senderSandboxTools: MCPToolItem[];
  setSenderSandboxTools: (data: MCPToolItem[]) => void;
  // Built-in tools available in the sender.
  senderPluginTools: MCPToolItem[];
  setSenderPluginTools: (data: MCPToolItem[]) => void;
  // Workflow tools available in the sender.
  senderWorkflowTools: MCPToolItem[];
  setSenderWorkflowTools: (data: MCPToolItem[]) => void;
  // Skill tools available in the sender.
  senderSkillTools: MCPToolItem[];
  setSenderSkillTools: (data: MCPToolItem[]) => void;
  // MCP tools selected in the sender.
  selectedSenderMCPTools: MCPToolItem[];
  setSelectedSenderMCPTools: (data: MCPToolItem[] | ((prev: MCPToolItem[]) => MCPToolItem[])) => void;

  // FileViewer state: hidden, visible, or visible and maximized.
  fileViewerFile?: E2BFile | FileItem;
  fileViewerSiblings?: (E2BFile | FileItem)[];
  setFileViewerFile: (file?: E2BFile | FileItem, siblings?: (E2BFile | FileItem)[]) => void;
  fileViewerMaximized: boolean;
  setFileViewerMaximized: (maximized: boolean) => void;

  previousSessionId: string;
  setPreviousSessionId: (id: string) => void;

  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
  pendingClientToolResult: boolean;
  setPendingClientToolResult: (pending: boolean) => void;

  knowledgeReadonly?: boolean;
  setKnowledgeReadonly: (readonly: boolean) => void;
  toolReadonly?: boolean;
  setToolReadonly: (readonly: boolean) => void;
  fileUploadDisabled?: boolean;
  setFileUploadDisabled: (disabled: boolean) => void;
  filePreviewConfig?: FilePreviewConfig;
  setFilePreviewConfig: (config?: FilePreviewConfig) => void;
  showSenderActions?: boolean;
  setShowSenderActions: (show: boolean) => void;

  // Model selection
  senderModels?: ModelItem[];
  setSenderModels: (senderModels?: ModelItem[]) => void;
  // Models selected in the sender.
  selectedSenderModels: ModelItem[];
  setSelectedSenderModels: (data: ModelItem[]) => void;

  // General Agent scenario mode.
  generalAgentMode?: string;
  setGeneralAgentMode: (mode?: string) => void;

  // Deep Research configuration.
  deepResearchOptions?: any;
  setDeepResearchOptions: (options?: any) => void;
  // Sender options supplied by the SDK.
  senderOptionsConfig: SenderOptionConfig[];
  setSenderOptionsConfig: (options: SenderOptionConfig[]) => void;
  // Selected sender option values included in request options.
  senderOptionsValues: Record<string, string>;
  setSenderOptionsValues: (values: Record<string, string>) => void;

  // Resolved layout configuration after merging the preset and explicit fields.
  layoutConfig: Required<AgentLayoutConfig>;
  setLayoutConfig: (config: AgentLayoutConfig) => void;

  // Resolved session behavior configuration.
  sessionConfig: Required<AgentSessionConfig>;
  setSessionConfig: (config: AgentSessionConfig) => void;

  // Sender behavior configuration.
  senderConfig: AgentSenderConfig;
  setSenderConfig: (config: AgentSenderConfig) => void;

  // Controlled configuration for the right panel.
  previewConfig?: {
    rightPanelVisible?: boolean;
    onRightPanelVisibleChange?: (visible: boolean, trigger: 'auto' | 'user' | 'tool') => void;
  };
  setPreviewConfig: (config?: AgentStore['previewConfig']) => void;

  // Whether workspace visibility is controlled externally through previewConfig.workspaceVisible.
  rightPanelExternalControl: boolean;
  setRightPanelExternalControl: (control: boolean) => void;

  // Source of the most recent workspace action.
  lastWorkspaceAction?: 'auto' | 'user' | 'tool';
  setLastWorkspaceAction: (action?: 'auto' | 'user' | 'tool') => void;

  // Sender placeholder.
  placeholder?: string;
  setPlaceholder: (placeholder?: string) => void;

  // Mode passed to the backend when creating a session.
  sessionMode?: string;
  setSessionMode: (mode?: string) => void;
  // Cloud phone authentication information.
  cloudPhoneAuthInfo?: CloudPhoneAuthInfo;
  setCloudPhoneAuthInfo: (info?: CloudPhoneAuthInfo) => void;

  // Direct chat endpoint; when set, skip session creation.
  chatEndpoint?: string;
  setChatEndpoint: (endpoint: string) => void;

  clientToolHandlers: ClientToolHandlers;
  setClientToolHandlers: (handlers: ClientToolHandlers) => void;
  onToolResult?: (context: ToolResultContext) => void | Promise<void>;
  setOnToolResult: (onToolResult?: (context: ToolResultContext) => void | Promise<void>) => void;
  onSessionLoaded?: (sessionInfo: SessionInfo, chunks: MessageChunk[]) => void | Promise<void>;
  setOnSessionLoaded: (
    onSessionLoaded?: (sessionInfo: SessionInfo, chunks: MessageChunk[]) => void | Promise<void>,
  ) => void;

  /**
   * Called when chunks are received.
   */
  onChunks?: (chunks: MessageChunk[]) => void;
  setOnChunks: (onChunks?: (chunks: MessageChunk[]) => void) => void;
  /**
   * Called when a new message is received.
   */
  onNewMessage?: (message: MessageItem) => void;
  setOnNewMessage: (onNewMessage?: (message: MessageItem) => void) => void;
  /**
   * Called when session information changes.
   */
  onSessionInfoChange?: (sessionInfo: SessionInfo) => void;
  setOnSessionInfoChange: (onSessionInfoChange?: (sessionInfo: SessionInfo) => void) => void;
  /**
   * Called when the tool list changes.
   */
  onToolsUpdate?: (tools: any[]) => void;
  setOnToolsUpdate: (onToolsUpdate?: (tools: any[]) => void) => void;

  onStopped?: () => void;
  setOnStopped: (onStopped?: () => void) => void;

  stopped?: boolean;
  setStopped: (stopped: boolean) => void;

  autoOpenRightPanel?: boolean;
  setAutoOpenRightPanel: (autoOpenRightPanel: boolean) => void;

  /**
   * Disable workspace rendering.
   * Tool calls still appear as brief chat messages but do not open workspace details.
   */
  disableWorkspaceRendering?: boolean;
  setDisableWorkspaceRendering: (disableWorkspaceRendering: boolean) => void;

  /**
   * Whether to open file previews directly in full-screen mode.
   */
  fullscreenFilePreview?: boolean;
  setFullscreenFilePreview: (fullscreenFilePreview: boolean) => void;

  onSessionCreated?: (sessionInfo: SessionInfo) => void | Promise<void>;
  setOnSessionCreated: (onSessionCreated?: (sessionInfo: SessionInfo) => void | Promise<void>) => void;

  resetStore: () => void;
}

// Factory that creates an isolated store for each instanceId.
export const createAgentStore = (instanceId: string) => {
  return createStore<AgentStore>()(
    devtools<AgentStore>(
      (set, get) => ({
        instanceId,
        agentId: '',
        sessionId: '',
        sessionInfo: undefined,
        basePath: '',
        mode: AgentMode.Chatbot,
        shareId: '',
        sharePassword: '',
        isNavigating: false,
        pipelineMessages: [],
        pipelineTargetMessage: null,
        workspaceMessages: [],
        workspaceVisible: false,

        taskStage: TaskStage.Pending,
        taskPlan: [],
        chunks: [],
        senderLoading: false,
        senderStopping: false,
        senderSending: false,
        senderContent: '',
        senderFiles: [],
        senderMetadata: undefined,
        renderMessageMetadata: undefined,
        renderHitlApproval: undefined,
        senderFilesConfig: { maxLength: 10 },
        senderKnowledgeBases: [],
        selectedSenderKnowledgeBases: [],
        senderMCPTools: [],
        senderSandboxTools: [],
        selectedSenderMCPTools: [],
        senderPluginTools: [],
        senderWorkflowTools: [],
        senderSkillTools: [],
        fileViewerFile: undefined,
        fileViewerSiblings: [],
        fileViewerMaximized: false,
        previousSessionId: '',
        abortController: null,
        pendingClientToolResult: false,
        senderModels: undefined,
        selectedSenderModels: [],
        generalAgentMode: undefined,
        deepResearchOptions: undefined,
        senderOptionsConfig: [],
        senderOptionsValues: {},
        layoutConfig: { showWorkspace: true, showHomePage: true, narrowMode: false, headerPosition: 'outer' },
        sessionConfig: { enableRouting: true, enableSessionLoading: true, autoRetryOnArchive: false },
        senderConfig: {},
        previewConfig: undefined,
        rightPanelExternalControl: false,
        lastWorkspaceAction: undefined,
        placeholder: undefined,
        cloudPhoneAuthInfo: undefined,
        autoOpenRightPanel: true,
        disableWorkspaceRendering: false,
        fullscreenFilePreview: false,
        onSessionCreated: undefined,
        setOnSessionCreated: (onSessionCreated?: (sessionInfo: SessionInfo) => void | Promise<void>) =>
          set({ onSessionCreated }),
        setAutoOpenRightPanel: (autoOpenRightPanel: boolean) => set({ autoOpenRightPanel }),
        setDisableWorkspaceRendering: (disableWorkspaceRendering: boolean) => set({ disableWorkspaceRendering }),
        setFullscreenFilePreview: (fullscreenFilePreview: boolean) => set({ fullscreenFilePreview }),
        setCloudPhoneAuthInfo: (cloudPhoneAuthInfo?: CloudPhoneAuthInfo) => set({ cloudPhoneAuthInfo }),
        setPreviousSessionId: (id: string) => set({ previousSessionId: id }),
        setAgentId: (agentId: string) => set({ agentId }),
        setSenderModels: (senderModels?: ModelItem[]) => set({ senderModels }),
        setSelectedSenderModels: (data: ModelItem[]) => set({ selectedSenderModels: data }),
        setGeneralAgentMode: (generalAgentMode?: string) => set({ generalAgentMode }),
        setDeepResearchOptions: (deepResearchOptions?: any) => set({ deepResearchOptions }),
        setSenderOptionsConfig: (senderOptionsConfig: SenderOptionConfig[]) => set({ senderOptionsConfig }),
        setSenderOptionsValues: (senderOptionsValues: Record<string, string>) => set({ senderOptionsValues }),
        setSessionId: (sessionId: string) => set({ sessionId }),
        setSessionInfo: (sessionInfo?: SessionInfo) => set({ sessionInfo }),
        setBasePath: (basePath: string) => set({ basePath }),
        setMode: (mode: AgentMode) => set({ mode }),

        setShareId: (shareId: string) => set({ shareId }),
        setSharePassword: (sharePassword: string) => set({ sharePassword }),
        setIsNavigating: (isNavigating: boolean) => set({ isNavigating }),
        setPipelineMessages: (pipelineMessages: MessageItem[]) => set({ pipelineMessages }),
        setPipelineTargetMessage: (pipelineTargetMessage: any) =>
          set({
            pipelineTargetMessage,
            workspaceVisible: !get().disableWorkspaceRendering,
            fileViewerFile: undefined,
          }),
        setWorkspaceMessages: (workspaceMessages: any[]) => {
          set({ workspaceMessages });
          get().onToolsUpdate?.(workspaceMessages);
        },
        setWorkspaceVisible: (workspaceVisible: boolean) => {
          if (workspaceVisible && get().disableWorkspaceRendering) {
            set({ workspaceVisible: false });
            return;
          }
          set({ workspaceVisible });
          // When the workspace is visible, clear fileViewerFile so no file is shown.
          if (workspaceVisible) {
            set({ fileViewerFile: undefined });
          }
        },

        setFileViewerFile: (fileViewerFile?: E2BFile | FileItem, fileViewerSiblings?: (E2BFile | FileItem)[]) => {
          set({ fileViewerFile, fileViewerSiblings: fileViewerSiblings || [] });
          // When a file is selected, hide the workspace and show the file viewer.
          if (fileViewerFile) {
            set({ workspaceVisible: false });
            if (get().fullscreenFilePreview && get().lastWorkspaceAction !== 'auto') {
              set({ fileViewerMaximized: true });
            }
          }
          // When no file is selected, reset maximized mode and show the conversation.
          if (!fileViewerFile) {
            set({ fileViewerMaximized: false, fileViewerSiblings: [] });
          }
        },
        setFileViewerMaximized: (fileViewerMaximized: boolean) => set({ fileViewerMaximized }),
        setTaskStage: (taskStage: TaskStage) => set({ taskStage }),
        setTaskPlan: (taskPlan: PlanStep[]) => set({ taskPlan }),
        setChunks: (payload: MessageChunk[] | ((prev: MessageChunk[]) => MessageChunk[])) => {
          const newChunks = isFunction(payload) ? payload(get().chunks) : payload;
          const oldMessages = get().pipelineMessages;
          const newMessages = transformChunksToMessages(newChunks);

          // Notify for newly completed messages.
          const lastOldMessage = oldMessages[oldMessages.length - 1];
          const lastNewMessage = newMessages[newMessages.length - 1];

          if (
            lastNewMessage &&
            lastNewMessage.role === 'assistant' &&
            isMessageFinish(lastNewMessage) &&
            (!lastOldMessage || lastOldMessage.id !== lastNewMessage.id || !isMessageFinish(lastOldMessage))
          ) {
            get().onNewMessage?.(lastNewMessage);
          }

          set({ pipelineMessages: newMessages, chunks: newChunks });
        },
        addChunk: (chunk: MessageChunk) => {
          get().addChunks([chunk]);
        },
        addChunks: (chunks: MessageChunk[]) => {
          const newChunks = [...get().chunks, ...chunks];
          const oldMessages = get().pipelineMessages;
          const newMessages = transformChunksToMessages(chunks, oldMessages);

          // Notify for newly completed messages.
          const lastOldMessage = oldMessages[oldMessages.length - 1];
          const lastNewMessage = newMessages[newMessages.length - 1];

          if (
            lastNewMessage &&
            lastNewMessage.role === 'assistant' &&
            isMessageFinish(lastNewMessage) &&
            (!lastOldMessage || lastOldMessage.id !== lastNewMessage.id || !isMessageFinish(lastOldMessage))
          ) {
            get().onNewMessage?.(lastNewMessage);
          }

          set({ pipelineMessages: newMessages, chunks: newChunks });
        },
        clearChunks: () => set({ chunks: [] }),
        setSenderLoading: (senderLoading: boolean) => set({ senderLoading }),
        setSenderStopping: (senderStopping: boolean) => set({ senderStopping }),
        setSenderSending: (senderSending: boolean) => set({ senderSending }),
        setSenderContent: (senderContent: string) => set({ senderContent }),
        setSenderFiles: (payload: FileItem[] | ((prev: FileItem[]) => FileItem[])) =>
          set(({ senderFiles }) => ({
            senderFiles: isFunction(payload) ? payload(senderFiles) : payload,
          })),
        setSenderMetadata: (senderMetadata?: MessageMetadata) => set({ senderMetadata }),
        setRenderMessageMetadata: (renderMessageMetadata?: RenderMessageMetadata) => set({ renderMessageMetadata }),
        setRenderHitlApproval: (renderHitlApproval?: RenderHitlApproval) => set({ renderHitlApproval }),
        setSenderFilesConfig: ({
          senderFiles = [],
          ...config
        }: {
          senderFiles?: FileItem[];
          maxLength?: number;
          accept?: string;
          onRemove?: (file?: FileItem) => void;
          beforeUpload?: (fileList: File[], file: File) => boolean;
          Button?: FC<any> | null;
        }) => {
          set((state) => {
            // Merge uploaded files while keeping at most one PPTX file (2025-10-17).
            const mergedFiles = mergeFiles(state.senderFiles, senderFiles);
            return {
              ...state,
              senderFiles: mergedFiles,
              senderFilesConfig: {
                ...state.senderFilesConfig,
                ...config,
              },
            };
          });
        },
        setSenderKnowledgeBases: (senderKnowledgeBases: KnowledgeBaseItem[]) => set({ senderKnowledgeBases }),
        setSelectedSenderKnowledgeBases: (selectedSenderKnowledgeBases: KnowledgeBaseItem[]) =>
          set({ selectedSenderKnowledgeBases }),
        setSenderMCPTools: (senderMCPTools: MCPToolItem[]) => set({ senderMCPTools }),
        setSenderSandboxTools: (senderSandboxTools: MCPToolItem[]) => set({ senderSandboxTools }),
        setSelectedSenderMCPTools: (payload: MCPToolItem[] | ((prev: MCPToolItem[]) => MCPToolItem[])) =>
          set(({ selectedSenderMCPTools }) => ({
            selectedSenderMCPTools: isFunction(payload) ? payload(selectedSenderMCPTools) : payload,
          })),
        setSenderPluginTools: (senderPluginTools: MCPToolItem[]) => set({ senderPluginTools }),
        setSenderWorkflowTools: (senderWorkflowTools: MCPToolItem[]) => set({ senderWorkflowTools }),
        setSenderSkillTools: (senderSkillTools: MCPToolItem[]) => set({ senderSkillTools }),
        setAbortController: (controller: AbortController | null) => set({ abortController: controller }),
        setPendingClientToolResult: (pendingClientToolResult: boolean) => set({ pendingClientToolResult }),
        setKnowledgeReadonly: (knowledgeReadonly: boolean) => set({ knowledgeReadonly }),
        setToolReadonly: (toolReadonly: boolean) => set({ toolReadonly }),
        fileUploadDisabled: undefined,
        setFileUploadDisabled: (fileUploadDisabled: boolean) => set({ fileUploadDisabled }),
        filePreviewConfig: undefined,
        setFilePreviewConfig: (filePreviewConfig?: FilePreviewConfig) => set({ filePreviewConfig }),
        showSenderActions: false,
        setShowSenderActions: (showSenderActions: boolean) => set({ showSenderActions }),
        setLayoutConfig: (layoutConfig: AgentLayoutConfig) =>
          set((state) => ({ layoutConfig: { ...state.layoutConfig, ...layoutConfig } })),
        setSessionConfig: (sessionConfig: AgentSessionConfig) =>
          set((state) => ({ sessionConfig: { ...state.sessionConfig, ...sessionConfig } })),
        setSenderConfig: (senderConfig: AgentSenderConfig) => set({ senderConfig }),
        setPreviewConfig: (previewConfig?: AgentStore['previewConfig']) => set({ previewConfig }),
        setRightPanelExternalControl: (rightPanelExternalControl: boolean) => set({ rightPanelExternalControl }),
        setLastWorkspaceAction: (lastWorkspaceAction?: 'auto' | 'user' | 'tool') => set({ lastWorkspaceAction }),
        setPlaceholder: (placeholder?: string) => set({ placeholder }),
        sessionMode: undefined,
        setSessionMode: (sessionMode?: string) => set({ sessionMode }),

        chatEndpoint: undefined,
        setChatEndpoint: (chatEndpoint: string) => set({ chatEndpoint }),
        clientToolHandlers: {},
        setClientToolHandlers: (clientToolHandlers: ClientToolHandlers) => set({ clientToolHandlers }),
        onToolResult: undefined,
        setOnToolResult: (onToolResult?: (context: ToolResultContext) => void | Promise<void>) =>
          set({ onToolResult }),
        onSessionLoaded: undefined,
        setOnSessionLoaded: (
          onSessionLoaded?: (sessionInfo: SessionInfo, chunks: MessageChunk[]) => void | Promise<void>,
        ) => set({ onSessionLoaded }),

        onChunks: undefined,
        setOnChunks: (onChunks?: (chunks: MessageChunk[]) => void) => set({ onChunks }),
        onNewMessage: undefined,
        setOnNewMessage: (onNewMessage?: (message: MessageItem) => void) => set({ onNewMessage }),
        onSessionInfoChange: undefined,
        setOnSessionInfoChange: (onSessionInfoChange?: (sessionInfo: SessionInfo) => void) =>
          set({ onSessionInfoChange }),
        onToolsUpdate: undefined,
        setOnToolsUpdate: (onToolsUpdate?: (tools: any[]) => void) => set({ onToolsUpdate }),

        onStopped: undefined,
        setOnStopped: (onStopped?: () => void) => set({ onStopped }),

        stopped: false,
        setStopped: (stopped: boolean) => {
          set({ stopped });
          if (stopped) {
            get().onStopped?.();
          }
        },

        requestConfig: {
          extraHeaders: {},
        },
        setRequestConfig: (config: Partial<AgentStore['requestConfig']>) => set({ requestConfig: config }),

        resetStore: () => {
          get().abortController?.abort();
          set({
            chunks: [],
            senderFiles: [],
            senderMetadata: undefined,
            sessionId: '',
            sessionInfo: undefined,
            senderLoading: false,
            senderStopping: false,
            senderSending: false,
            senderContent: '',
            fileViewerFile: undefined,
            fileViewerSiblings: [],
            taskPlan: [],
            pipelineMessages: [],
            pipelineTargetMessage: null,
            workspaceMessages: [],
            abortController: null,
            pendingClientToolResult: false,
            workspaceVisible: false,
            previousSessionId: '', // Clear this so returning to the previous session is recognized as a change.
            selectedSenderModels: [],
            generalAgentMode: undefined,
            deepResearchOptions: undefined,
            senderOptionsValues: {},
            cloudPhoneAuthInfo: undefined,
          });
        },
      }),
      {
        name: `AgentStore-${instanceId}`,
      },
    ),
  );
};

// Default global store retained for backward compatibility.
const useAgentStore = createAgentStore('global');
export default useAgentStore;
