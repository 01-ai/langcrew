import { FC } from 'react';
import { createStore } from 'zustand/vanilla';
import {
  TaskStage,
  AgentMode,
  PlanStep,
  FileItem,
  KnowledgeBaseItem,
  AgentTool,
  MessageChunk,
  MessageMetadata,
  RenderMessageMetadata,
  RenderHitlApproval,
  MentionConfig,
  SessionInfo,
  E2BFile,
  MessageItem,
  SenderFilesConfig,
  ModelItem,
  CloudPhoneAuthInfo,
  SenderOptionConfig,
  FilePreviewConfig,
  AgentTraceConfig,
  AgentLayoutConfig,
  AgentSessionConfig,
  AgentSenderConfig,
  ToolResultContext,
  CitationSource,
  Mention,
  ConversationFeedback,
  FeedbackMap,
  FileUploadConfig,
} from '@/types';
import type { ClientToolHandlers } from '@/sdk/clientTools';
import type { AgentXCapabilities, AgentXRequestAdapter } from '@/services/requestClient';
import { isFunction } from 'lodash-es';
import { transformChunksToMessages } from '@/hooks/useChat/transformChunksToMessages';
import { devtools } from 'zustand/middleware';
import { mergeFiles } from '@/utils/file';
import { isMessageFinish } from '@/hooks/useChat/utils';

export interface AgentStore {
  // Instance id
  instanceId: string;
  // Agent basic info
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
  displayMode: 'page' | 'embedded';
  setDisplayMode: (mode: 'page' | 'embedded') => void;
  embeddedSessionId: string | null;
  setEmbeddedSessionId: (id: string | null) => void;

  // Share info
  shareId: string;
  setShareId: (id: string) => void;
  sharePassword: string;
  setSharePassword: (password: string) => void;

  // Navigation flag — avoid reloading data after navigate
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;

  // Agent data message; Message type TBD

  // Left main-flow data
  pipelineMessages: MessageItem[];
  setPipelineMessages: (data: MessageItem[]) => void;

  // Left main flow: click a detail message
  pipelineTargetMessage: any;
  setPipelineTargetMessage: (data: any) => void;
  // Workspace sidebar data
  workspaceMessages: any[];
  setWorkspaceMessages: (data: any[]) => void;

  // Workspace sidebar visibility
  workspaceVisible: boolean;
  setWorkspaceVisible: (visible: boolean) => void;

  // Citation panel for the current answer
  citationPanelSources?: CitationSource[];
  openCitationPanel: (sources: CitationSource[]) => void;
  closeCitationPanel: (notifyHost?: boolean) => void;

  // Agent task info

  // Task state machine: wait -> think -> plan -> execute -> HITL (optional) -> success / fail
  taskStage: TaskStage;
  setTaskStage: (status: TaskStage) => void;

  // Task plan
  taskPlan: PlanStep[];
  setTaskPlan: (plan: PlanStep[]) => void;

  // Chunks data
  chunks: MessageChunk[];
  setChunks: (chunks: MessageChunk[] | ((prev: MessageChunk[]) => MessageChunk[])) => void;
  addChunk: (chunk: MessageChunk) => void;
  addChunks: (chunks: MessageChunk[]) => void;
  clearChunks: () => void;

  // Response like/dislike, keyed by response_id
  feedbackMap: FeedbackMap;
  setFeedbackMap: (feedbackMap: FeedbackMap) => void;
  setFeedback: (responseId: string, feedback: ConversationFeedback) => void;
  clearFeedback: (responseId: string) => void;

  // Show loading while the SSE request is pending
  senderLoading: boolean;
  setSenderLoading: (loading: boolean) => void;
  // Input disabled
  // Unused; sessionInfo.status already tells whether send is allowed
  // senderDisabled: boolean;
  // setSenderDisabled: (disabled: boolean) => void;
  // Input is stopping
  senderStopping: boolean;
  setSenderStopping: (stopping: boolean) => void;
  // Show loading while SSE data is being processed
  senderSending: boolean;
  setSenderSending: (sending: boolean) => void;
  // Input content
  senderContent: string;
  setSenderContent: (value: string) => void;
  // Input mentions (match @type:id tokens in content)
  senderMentions: Mention[];
  setSenderMentions: (mentions: Mention[]) => void;
  // Input files
  senderFiles: FileItem[];
  setSenderFiles: (file: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  // Input message-level metadata (e.g. citation cards)
  senderMetadata?: MessageMetadata;
  setSenderMetadata: (metadata?: MessageMetadata) => void;
  // Custom message-metadata renderer
  renderMessageMetadata?: RenderMessageMetadata;
  setRenderMessageMetadata: (renderMessageMetadata?: RenderMessageMetadata) => void;
  renderHitlApproval?: RenderHitlApproval;
  setRenderHitlApproval: (renderHitlApproval?: RenderHitlApproval) => void;
  // Mention chip host interaction (tooltip / click)
  mentionConfig?: MentionConfig;
  setMentionConfig: (mentionConfig?: MentionConfig) => void;
  senderFilesConfig: SenderFilesConfig;
  setSenderFilesConfig: (config: {
    senderFiles?: FileItem[];
    maxLength?: number;
    accept?: string;
    maxSize?: number;
    multiple?: boolean;
    customUploadRequest?: (file: File) => Promise<string>;
    onRemove?: (file?: FileItem) => void;
    beforeUpload?: (fileList: File[], file: File) => boolean;
    Button?: FC<any> | null;
  }) => void;

  // Input knowledge bases
  senderKnowledgeBases: KnowledgeBaseItem[];
  setSenderKnowledgeBases: (data: KnowledgeBaseItem[]) => void;
  // Selected input knowledge bases
  selectedSenderKnowledgeBases: KnowledgeBaseItem[];
  setSelectedSenderKnowledgeBases: (data: KnowledgeBaseItem[]) => void;
  // Input tool list (host-supplied unified tools)
  senderTools: AgentTool[];
  setSenderTools: (data: AgentTool[]) => void;

  // FileViewer: hidden, shown, or shown maximized
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
  traceConfig?: AgentTraceConfig;
  setTraceConfig: (config?: AgentTraceConfig) => void;
  showSenderActions?: boolean;
  setShowSenderActions: (show: boolean) => void;

  // Model selection
  senderModels?: ModelItem[];
  setSenderModels: (senderModels?: ModelItem[]) => void;
  // Selected input model
  selectedSenderModels: ModelItem[];
  setSelectedSenderModels: (data: ModelItem[]) => void;

  // General agent mode
  generalAgentMode?: string;
  setGeneralAgentMode: (mode?: string) => void;

  // Deep Research options
  deepResearchOptions?: any;
  setDeepResearchOptions: (options?: any) => void;
  // Sender options config (from the SDK)
  senderOptionsConfig: SenderOptionConfig[];
  setSenderOptionsConfig: (options: SenderOptionConfig[]) => void;
  // Current sender option values (assembled into request options)
  senderOptionsValues: Record<string, string>;
  setSenderOptionsValues: (values: Record<string, string>) => void;

  // Resolved layout (preset merged with explicit fields)
  layoutConfig: Required<AgentLayoutConfig>;
  setLayoutConfig: (config: AgentLayoutConfig) => void;

  // Resolved session behavior
  sessionConfig: Required<AgentSessionConfig>;
  setSessionConfig: (config: AgentSessionConfig) => void;

  // Input behavior config
  senderConfig: AgentSenderConfig;
  setSenderConfig: (config: AgentSenderConfig) => void;

  // Controlled right-panel config (panel fields only)
  previewConfig?: {
    rightPanelVisible?: boolean;
    onRightPanelVisibleChange?: (visible: boolean, trigger: 'auto' | 'user' | 'tool') => void;
  };
  setPreviewConfig: (config?: AgentStore['previewConfig']) => void;

  // Workspace controlled-mode flag (true when previewConfig.workspaceVisible is set)
  rightPanelExternalControl: boolean;
  setRightPanelExternalControl: (control: boolean) => void;

  // Trigger of the last workspace action
  lastWorkspaceAction?: 'auto' | 'user' | 'tool';
  setLastWorkspaceAction: (action?: 'auto' | 'user' | 'tool') => void;

  // Input placeholder
  placeholder?: string;
  setPlaceholder: (placeholder?: string) => void;

  // Mode forwarded when creating a session
  sessionMode?: string;
  setSessionMode: (mode?: string) => void;
  // Cloud-phone auth
  cloudPhoneAuthInfo?: CloudPhoneAuthInfo;
  setCloudPhoneAuthInfo: (info?: CloudPhoneAuthInfo) => void;

  // Direct chat endpoint; skip session creation when set
  chatEndpoint: string;
  setChatEndpoint: (endpoint: string) => void;
  extraHeaders: Record<string, string>;
  setExtraHeaders: (headers: Record<string, string>) => void;
  fileUploadConfig: FileUploadConfig;
  setFileUploadConfig: (config: FileUploadConfig) => void;
  requestConfig: {
    extraHeaders: Record<string, string>;
    adapter?: AgentXRequestAdapter;
    capabilities?: AgentXCapabilities;
  };
  setRequestConfig: (config: Partial<AgentStore['requestConfig']>) => void;

  clientToolHandlers: ClientToolHandlers;
  setClientToolHandlers: (handlers: ClientToolHandlers) => void;
  onToolResult?: (context: ToolResultContext) => void | Promise<void>;
  setOnToolResult: (onToolResult?: (context: ToolResultContext) => void | Promise<void>) => void;
  onSessionLoaded?: (sessionInfo: SessionInfo, chunks: MessageChunk[]) => void | Promise<void>;
  setOnSessionLoaded: (
    onSessionLoaded?: (sessionInfo: SessionInfo, chunks: MessageChunk[]) => void | Promise<void>,
  ) => void;

  /**
   * Chunks received callback
   */
  onChunks?: (chunks: MessageChunk[]) => void;
  setOnChunks: (onChunks?: (chunks: MessageChunk[]) => void) => void;
  /**
   * New message callback
   */
  onNewMessage?: (message: MessageItem) => void;
  setOnNewMessage: (onNewMessage?: (message: MessageItem) => void) => void;
  /**
   * Session info update callback
   */
  onSessionInfoChange?: (sessionInfo: SessionInfo) => void;
  setOnSessionInfoChange: (onSessionInfoChange?: (sessionInfo: SessionInfo) => void) => void;
  /**
   * Tool update callback
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
   * Tool calls can still show as brief chat info without opening workspace detail.
   */
  disableWorkspaceRendering?: boolean;
  setDisableWorkspaceRendering: (disableWorkspaceRendering: boolean) => void;

  /**
   * Whether file preview opens fullscreen immediately.
   */
  fullscreenFilePreview?: boolean;
  setFullscreenFilePreview: (fullscreenFilePreview: boolean) => void;

  onSessionCreated?: (sessionInfo: SessionInfo) => void | Promise<void>;
  setOnSessionCreated: (onSessionCreated?: (sessionInfo: SessionInfo) => void | Promise<void>) => void;

  onManageSkills?: () => void;
  setOnManageSkills: (onManageSkills?: () => void) => void;

  resetStore: () => void;
}

// Factory: create an isolated store per instanceId
export const createAgentStore = (instanceId: string, initialDisplayMode: 'page' | 'embedded' = 'page') => {
  return createStore<AgentStore>()(
    devtools<AgentStore>(
      (set, get) => ({
        instanceId,
        agentId: '',
        sessionId: '',
        sessionInfo: undefined,
        basePath: '',
        mode: AgentMode.Chatbot,
        displayMode: initialDisplayMode,
        embeddedSessionId: null,
        shareId: '',
        sharePassword: '',
        isNavigating: false,
        pipelineMessages: [],
        pipelineTargetMessage: null,
        workspaceMessages: [],
        workspaceVisible: false,
        citationPanelSources: undefined,

        taskStage: TaskStage.Pending,
        taskPlan: [],
        chunks: [],
        feedbackMap: {},
        senderLoading: false,
        senderStopping: false,
        senderSending: false,
        senderContent: '',
        senderMentions: [],
        senderFiles: [],
        senderMetadata: undefined,
        renderMessageMetadata: undefined,
        renderHitlApproval: undefined,
        mentionConfig: undefined,
        senderFilesConfig: { maxLength: 10 },
        senderKnowledgeBases: [],
        selectedSenderKnowledgeBases: [],
        senderTools: [],
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
        sessionConfig: {
          enableRouting: true,
          enableSessionLoading: false,
          autoRetryOnArchive: false,
          enableFeedback: false,
        },
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
        onManageSkills: undefined,
        setOnManageSkills: (onManageSkills?: () => void) => set({ onManageSkills }),
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
        setSessionId: (sessionId: string) =>
          set((state) => ({
            sessionId,
            citationPanelSources:
              state.sessionId !== sessionId ? undefined : state.citationPanelSources,
          })),
        setSessionInfo: (sessionInfo?: SessionInfo) => {
          set({ sessionInfo });
          if (sessionInfo) {
            get().onSessionInfoChange?.(sessionInfo);
          }
        },
        setBasePath: (basePath: string) => set({ basePath }),
        setMode: (mode: AgentMode) => set({ mode }),
        setDisplayMode: (displayMode: 'page' | 'embedded') => set({ displayMode }),
        setEmbeddedSessionId: (embeddedSessionId: string | null) => set({ embeddedSessionId }),

        setShareId: (shareId: string) => set({ shareId }),
        setSharePassword: (sharePassword: string) => set({ sharePassword }),
        setIsNavigating: (isNavigating: boolean) => set({ isNavigating }),
        setPipelineMessages: (pipelineMessages: MessageItem[]) => set({ pipelineMessages }),
        setPipelineTargetMessage: (pipelineTargetMessage: any) =>
          set({
            pipelineTargetMessage,
            workspaceVisible: !get().disableWorkspaceRendering,
            fileViewerFile: undefined,
            citationPanelSources: undefined,
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
          set({
            workspaceVisible,
            ...(workspaceVisible ? { citationPanelSources: undefined } : {}),
          });
          // If workspace is visible, clear fileViewerFile so no file is shown
          if (workspaceVisible) {
            set({ fileViewerFile: undefined });
          }
        },

        setFileViewerFile: (fileViewerFile?: E2BFile | FileItem, fileViewerSiblings?: (E2BFile | FileItem)[]) => {
          set({
            fileViewerFile,
            fileViewerSiblings: fileViewerSiblings || [],
            ...(fileViewerFile ? { citationPanelSources: undefined } : {}),
          });
          // If fileViewerFile is set, hide workspace and show the file
          if (fileViewerFile) {
            set({ workspaceVisible: false });
            if (get().fullscreenFilePreview && get().lastWorkspaceAction !== 'auto') {
              set({ fileViewerMaximized: true });
            }
          }
          // If fileViewerFile is unset, un-maximize the viewer and show chat
          if (!fileViewerFile) {
            set({ fileViewerMaximized: false, fileViewerSiblings: [] });
          }
        },
        openCitationPanel: (citationPanelSources: CitationSource[]) => {
          if (citationPanelSources.length === 0) return;

          set({
            citationPanelSources,
            workspaceVisible: false,
            fileViewerFile: undefined,
            fileViewerSiblings: [],
            fileViewerMaximized: false,
            lastWorkspaceAction: 'user',
          });
        },
        closeCitationPanel: (notifyHost = true) =>
          set({
            citationPanelSources: undefined,
            lastWorkspaceAction: notifyHost ? 'user' : undefined,
          }),
        setFileViewerMaximized: (fileViewerMaximized: boolean) => set({ fileViewerMaximized }),
        setTaskStage: (taskStage: TaskStage) => set({ taskStage }),
        setTaskPlan: (taskPlan: PlanStep[]) => set({ taskPlan }),
        setChunks: (payload: MessageChunk[] | ((prev: MessageChunk[]) => MessageChunk[])) => {
          const newChunks = isFunction(payload) ? payload(get().chunks) : payload;
          const oldMessages = get().pipelineMessages;
          const newMessages = transformChunksToMessages(newChunks);

          // Check for a newly completed message
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

          // Check for a newly completed message
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
        setFeedbackMap: (feedbackMap: FeedbackMap) => set({ feedbackMap }),
        setFeedback: (responseId: string, feedback: ConversationFeedback) =>
          set((state) => ({
            feedbackMap: {
              ...state.feedbackMap,
              [responseId]: feedback,
            },
          })),
        clearFeedback: (responseId: string) =>
          set((state) => {
            if (!(responseId in state.feedbackMap)) {
              return state;
            }
            const nextFeedbackMap = { ...state.feedbackMap };
            delete nextFeedbackMap[responseId];
            return { feedbackMap: nextFeedbackMap };
          }),
        setSenderLoading: (senderLoading: boolean) => set({ senderLoading }),
        setSenderStopping: (senderStopping: boolean) => set({ senderStopping }),
        setSenderSending: (senderSending: boolean) => set({ senderSending }),
        setSenderContent: (senderContent: string) => set({ senderContent }),
        setSenderMentions: (senderMentions: Mention[]) => set({ senderMentions }),
        setSenderFiles: (payload: FileItem[] | ((prev: FileItem[]) => FileItem[])) =>
          set(({ senderFiles }) => ({
            senderFiles: isFunction(payload) ? payload(senderFiles) : payload,
          })),
        setSenderMetadata: (senderMetadata?: MessageMetadata) => set({ senderMetadata }),
        setRenderMessageMetadata: (renderMessageMetadata?: RenderMessageMetadata) => set({ renderMessageMetadata }),
        setRenderHitlApproval: (renderHitlApproval?: RenderHitlApproval) => set({ renderHitlApproval }),
        setMentionConfig: (mentionConfig?: MentionConfig) => set({ mentionConfig }),
        setSenderFilesConfig: ({
          senderFiles = [],
          ...config
        }: {
          senderFiles?: FileItem[];
          maxLength?: number;
          accept?: string;
          maxSize?: number;
          multiple?: boolean;
          customUploadRequest?: (file: File) => Promise<string>;
          onRemove?: (file?: FileItem) => void;
          beforeUpload?: (fileList: File[], file: File) => boolean;
          Button?: FC<any> | null;
        }) => {
          set((state) => {
            // 20251017 Merge uploads and allow only one pptx file
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
        setSenderTools: (senderTools: AgentTool[]) => set({ senderTools }),
        setAbortController: (controller: AbortController | null) => set({ abortController: controller }),
        setPendingClientToolResult: (pendingClientToolResult: boolean) => set({ pendingClientToolResult }),
        setKnowledgeReadonly: (knowledgeReadonly: boolean) => set({ knowledgeReadonly }),
        setToolReadonly: (toolReadonly: boolean) => set({ toolReadonly }),
        fileUploadDisabled: undefined,
        setFileUploadDisabled: (fileUploadDisabled: boolean) => set({ fileUploadDisabled }),
        filePreviewConfig: undefined,
        setFilePreviewConfig: (filePreviewConfig?: FilePreviewConfig) => set({ filePreviewConfig }),
        traceConfig: undefined,
        setTraceConfig: (traceConfig?: AgentTraceConfig) => set({ traceConfig }),
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

        chatEndpoint: '/api/v1/chat',
        setChatEndpoint: (chatEndpoint: string) => set({ chatEndpoint }),
        extraHeaders: {},
        setExtraHeaders: (extraHeaders: Record<string, string>) => set({ extraHeaders }),
        fileUploadConfig: {},
        setFileUploadConfig: (fileUploadConfig: FileUploadConfig) => set({ fileUploadConfig }),
        requestConfig: {
          extraHeaders: {},
        },
        setRequestConfig: (requestConfig: Partial<AgentStore['requestConfig']>) =>
          set((state) => ({
            requestConfig: {
              ...state.requestConfig,
              ...requestConfig,
            },
          })),
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

        resetStore: () => {
          get().abortController?.abort();
          set({
            chunks: [],
            feedbackMap: {},
            senderFiles: [],
            senderMetadata: undefined,
            sessionId: '',
            sessionInfo: undefined,
            senderLoading: false,
            senderStopping: false,
            senderSending: false,
            senderContent: '',
            senderMentions: [],
            fileViewerFile: undefined,
            fileViewerSiblings: [],
            taskPlan: [],
            pipelineMessages: [],
            pipelineTargetMessage: null,
            workspaceMessages: [],
            citationPanelSources: undefined,
            abortController: null,
            pendingClientToolResult: false,
            workspaceVisible: false,
            previousSessionId: '', // Clear previousSessionId so returning to an old session is not treated as "unchanged"
            selectedSenderModels: [],
            generalAgentMode: undefined,
            deepResearchOptions: undefined,
            senderOptionsValues: {},
            cloudPhoneAuthInfo: undefined,
            embeddedSessionId: null,
          });
        },
      }),
      {
        name: `AgentStore-${instanceId}`,
      },
    ),
  );
};

// Default global store (backward compatibility)
const useAgentStore = createAgentStore('global');
export default useAgentStore;
