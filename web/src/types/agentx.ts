import { StartScreenProps } from '@/components/Agent/Chatbot/StartScreen';
import { PreviewScreenProps, SessionInfo } from '@/sdk';
import type { ClientToolHandlers } from '@/sdk/clientTools';
import { FC } from 'react';
import type React from 'react';
import {
  E2BFile,
  HitlActionRequest,
  KnowledgeBaseItem,
  MCPToolItem,
  ModelItem,
  FileItem,
  MessageChunk,
  MessageItem,
  MessageMetadata,
  UserInputChunk,
} from '.';
import { ChatTitleProps } from '@/components/Agent/Chatbot/ChatTitle';
import { ChatFilesProps } from '@/components/Agent/Chatbot/ChatFiles';

export interface WelcomeScreenContext {
  /** Sends a message with the built-in disabled-state guard. */
  send: (prompt: string) => void;
  /** Appends text to the input without sending it, for example from a shortcut button. */
  appendText: (text: string) => void;
  /** Whether input is disabled by senderConfig.inputDisabled. */
  disabled: boolean;
}

/** Layout and display configuration. */
export interface AgentLayoutConfig {
  /** Shows the right Workspace panel. Defaults to true for page/preview and false for embedded. */
  showWorkspace?: boolean;
  /** Shows the Home page when no session exists. Defaults to true only in page mode. */
  showHomePage?: boolean;
  /** Uses full-width bubbles and inline tool details. Defaults to true only in embedded mode. */
  narrowMode?: boolean;
  /** Header position. Defaults to inner for preview and outer for other modes. */
  headerPosition?: 'outer' | 'inner';
}

/** className slots for AgentX regions. */
export interface AgentxClassNames {
  /** Outer conversation container, including chat and Workspace backgrounds but excluding the Header. */
  conversationArea?: string;
}

/** Style slots for AgentX regions. */
export interface AgentxStyles {
  conversationArea?: React.CSSProperties;
}

/** Session lifecycle configuration. */
export interface AgentSessionConfig {
  /** Navigates after creating a session. Defaults to true only in page mode. */
  enableRouting?: boolean;
  /** Loads session history when sessionId changes. Defaults to true only in page mode. */
  enableSessionLoading?: boolean;
  /** Starts a replacement session after archival. Defaults to true only in embedded mode. */
  autoRetryOnArchive?: boolean;
}

/** Slash-command shortcut. */
export interface SenderSkill {
  /** Unique skill identifier used as an internal key and search value. Prefer matching label. */
  value: string;
  /**
   * Content displayed in the candidate list and inserted into the input when selected.
   * ReactNode labels are inserted using String(label).
   * Defaults to value.
   */
  label?: React.ReactNode;
  /** Icon displayed for the shortcut. */
  icon?: React.ReactNode;
}

/** Input behavior configuration that replaces the send controls in previewConfig. */
export interface AgentSenderConfig {
  /** Initial input layout. singleLine starts compact and grows with its content. */
  inputMode?: 'multiLine' | 'singleLine';
  /** Disables the complete input area, including text input and file uploads. */
  inputDisabled?: boolean;
  /** Disables only the send button without disabling text input. */
  sendDisabled?: boolean;
  /** Tooltip shown when sending is disabled. */
  sendDisabledTooltip?: string;
  /**
   * Slash-command shortcuts shown when the user types `/`.
   * Selecting an item inserts its value into the input.
   */
  skills?: SenderSkill[];
  /**
   * Synchronizes selectedKnowledgeBases and selectedTools to the sender when a session already exists.
   * Defaults to false so selections restored from session history are not overwritten.
   */
  syncSelectedResourcesOnSession?: boolean;
}

export type MetadataRenderVariant = 'draft' | 'message';

export interface MessageMetadataRenderContext<TMetadata extends MessageMetadata<any> = MessageMetadata> {
  metadata: TMetadata;
  variant: MetadataRenderVariant;
  defaultRenderer: React.ReactNode;
  onReferenceRemove?: () => void;
}

export type RenderMessageMetadata<TMetadata extends MessageMetadata<any> = MessageMetadata> = (
  context: MessageMetadataRenderContext<TMetadata>,
) => React.ReactNode;

export interface HitlApprovalRenderContext {
  message: UserInputChunk;
  actionRequests: HitlActionRequest[];
  interactive: boolean;
  approveDisabled: boolean;
  rejectDisabled: boolean;
  onApprove: () => void;
  onReject: (message?: string) => void;
  defaultRenderer: React.ReactNode;
}

export type RenderHitlApproval = (context: HitlApprovalRenderContext) => React.ReactNode;

export interface ToolResultContext {
  /** Tool name normalized across server detail formats. */
  toolName: string;
  /** Original, untransformed tool-result chunk. */
  chunk: MessageChunk;
  /** Session that owns this result. */
  sessionId: string;
  /** Tool execution status, or undefined when omitted by the server. */
  status?: string;
  /** Tool execution result, or undefined when omitted by the server. */
  result?: unknown;
}

export interface SenderOptionChoice {
  label: string;
  value: string;
}

export interface SenderOptionConfig {
  type: 'select';
  label: string;
  field: string;
  defaultValue?: string;
  placeholder?: string;
  options: SenderOptionChoice[];
}

export interface AgentxMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export type AgentxMenuKey = 'deep_research' | 'create_image' | 'create_video' | 'canvas';

export type FilePreviewSource = 'attachment' | 'allFiles' | 'auto';

export interface FilePreviewContext {
  /** Currently selected file. */
  file: E2BFile | FileItem;
  /** Sibling attachments used for navigation between related files. */
  siblings: (E2BFile | FileItem)[];
  /** Source that triggered the preview. */
  source: FilePreviewSource;
  /** Opens the built-in AgentX preview in the Workspace or narrow modal. */
  defaultPreview: () => void;
}

export interface FilePreviewConfig {
  office?: {
    /**
     * Creates a custom Office preview URL.
     * @param fileUrl Original file URL.
     * @returns A preview URL that can be loaded directly in an iframe.
     */
    getPreviewUrl?: (fileUrl: string) => string;
  };
  /**
   * Handles file previews. When provided, AgentX calls only this callback instead of opening its built-in preview.
   * Call context.defaultPreview() explicitly to retain the built-in behavior.
   */
  onPreview?: (context: FilePreviewContext) => void;
  /**
   * Intercepts automatic previews from useChunksUISync.
   * Defaults to false, so automatic previews still use the built-in Workspace.
   */
  interceptAutoPreview?: boolean;
}

export interface AgentxProps<TMetadata extends MessageMetadata<any> = MessageMetadata> {
  /**
   * Automatically opens the right panel.
   */
  autoOpenRightPanel?: boolean;
  /**
   * Disables rendering details in the right Workspace.
   * Tool calls remain in the chat stream but do not open the Workspace.
   */
  disableWorkspaceRendering?: boolean;
  /**
   * Opens files directly in the fullscreen preview.
   */
  fullscreenFilePreview?: boolean;
  /** Direct chat endpoint. When provided, AgentX skips session creation and sends messages to this endpoint. */
  chatEndpoint?: string;
  /**
   * agentId
   */
  agentId: string;
  /**
   * sessionId
   */
  sessionId?: string;
  /** Session mode forwarded to the server during session creation. */
  sessionMode?: string;
  /**
   * Share ID.
   */
  shareId?: string;
  /**
   * Share password.
   */
  sharePassword?: string;
  /**
   * Base path. Page mode navigates to `${basePath}/${agentId}/${sessionId}`.
   */
  basePath?: string;
  /**
   * Unique AgentX instance identifier.
   * Instances with the same instanceKey share a store; different keys isolate state and request headers.
   * Defaults to `agent-${agentId}` so route changes for one agent reuse the same instance state.
   */
  instanceKey?: string;
  /**
   * Custom Header node.
   * Accepts either a ReactNode or a render function that receives AgentX components.
   */
  headerNode?: HeaderNode;
  /**
   * Custom Footer node.
   */
  footerNode?: React.ReactNode;
  /**
   * Custom share-button node.
   */
  shareButtonNode?: React.ReactNode;
  /**
   * Custom back-button node.
   */
  backButtonNode?: React.ReactNode;
  /**
   * Knowledge-base list.
   */
  knowledgeBases?: KnowledgeBaseItem[];
  /**
   * MCP tool list.
   */
  mcpTools?: MCPToolItem[];
  /**
   * Sandbox tool list.
   */
  sandboxTools?: MCPToolItem[];
  /**
   * Plugin tool list.
   */
  pluginTools?: MCPToolItem[];
  /**
   * Workflow tool list.
   */
  workflowTools?: MCPToolItem[];
  /**
   * Skill tool list.
   */
  skillTools?: MCPToolItem[];
  /**
   * Model list.
   */
  models?: ModelItem[];
  /**
   * Preselected models.
   */
  selectedModels?: string[];
  /**
   * Preselected knowledge bases.
   */
  selectedKnowledgeBases?: string[];
  /**
   * Preselected tools.
   */
  selectedTools?: string[];
  /**
   * API request path prefix.
   * @example '/app' or '/api/v1'
   */
  requestPrefix?: string;
  /**
   * Additional HTTP headers attached to every API request.
   */
  extraHeaders?: Record<string, string>;
  /**
   * Interface language.
   * @example 'zh-CN' | 'en-US'
   */
  language?: string;
  /**
   * Controlled input content, synchronized to the sender for prefilling or external control.
   */
  senderContent?: string;
  /**
   * File-sending configuration.
   */
  senderFilesConfig?: {
    senderFiles?: FileItem[];
    maxLength?: number;
    accept?: string;
    onRemove?: () => void;
    beforeUpload?: (fileList: File[], file: File) => boolean;
    Button?: FC<any> | null;
  };
  /**
   * Application metadata for the outgoing message, such as a reference card.
   * Sent to the server in the request body's top-level `metadata` field.
   */
  senderMetadata?: TMetadata;
  /**
   * Custom message metadata renderer. AgentX uses its default renderer when omitted.
   */
  renderMessageMetadata?: RenderMessageMetadata<TMetadata>;
  /**
   * Custom HITL approval card. The renderer controls presentation while AgentX callbacks submit the decision.
   */
  renderHitlApproval?: RenderHitlApproval;
  /**
   * Root class name.
   */
  className?: string;
  /**
   * Per-region className slots, separate from the root className.
   */
  classNames?: AgentxClassNames;
  /**
   * Per-region style slots.
   */
  styles?: AgentxStyles;
  /**
   * Home page outer-container class, used only in page mode without a session.
   */
  homeClassName?: string;
  /**
   * Home page content-container class, used only in page mode without a session.
   */
  homeContentClassName?: string;
  /**
   * Home page sender-container class, used only in page mode without a session.
   */
  homeSenderClassName?: string;
  /**
   * Makes knowledge bases read-only.
   */
  knowledgeReadonly?: boolean;
  /**
   * Makes tools read-only.
   */
  toolReadonly?: boolean;
  /**
   * Disables file uploads. When true, hides the upload button and disables pasted files.
   */
  fileUploadDisabled?: boolean;
  /**
   * File-preview configuration.
   */
  filePreviewConfig?: FilePreviewConfig;
  /**
   * Layout and display configuration.
   */
  layoutConfig?: AgentLayoutConfig;
  /**
   * Session lifecycle configuration.
   */
  sessionConfig?: AgentSessionConfig;
  /**
   * Input behavior configuration.
   */
  senderConfig?: AgentSenderConfig;
  /** Client-tool handlers for this AgentX instance. Instance handlers override matching global handlers. */
  clientToolHandlers?: ClientToolHandlers;
  /** Called after any server tool-result chunk is received. */
  onToolResult?: (context: ToolResultContext) => void | Promise<void>;
  /** Called after session history loads successfully. */
  onSessionLoaded?: (sessionInfo: SessionInfo, chunks: MessageChunk[]) => void | Promise<void>;
  /**
   * Backward-compatible display-mode preset.
   * @deprecated Use `layoutConfig` and `sessionConfig` for granular configuration. `senderConfig` is independent of displayMode.
   *
   * Equivalent configuration for each mode:
   *
   * **page** (default; navigates after creating a session):
   * ```tsx
   * layoutConfig={{
   *   showWorkspace: true,
   *   showHomePage: true,
   *   narrowMode: false,
   *   headerPosition: 'outer',
   * }}
   * sessionConfig={{
   *   enableRouting: true,
   *   enableSessionLoading: true,
   *   autoRetryOnArchive: false,
   * }}
   * ```
   *
   * **embedded** (stays on the current page after creating a session):
   * ```tsx
   * layoutConfig={{
   *   showWorkspace: false,
   *   showHomePage: false,
   *   narrowMode: true,
   *   headerPosition: 'outer',
   * }}
   * sessionConfig={{
   *   enableRouting: false,
   *   enableSessionLoading: false,
   *   autoRetryOnArchive: true,
   * }}
   * ```
   *
   * **preview** (shows the Workspace on the right without navigating after session creation):
   * ```tsx
   * layoutConfig={{
   *   showWorkspace: true,
   *   showHomePage: false,
   *   narrowMode: false,
   *   headerPosition: 'inner',
   * }}
   * sessionConfig={{
   *   enableRouting: false,
   *   enableSessionLoading: false,
   *   autoRetryOnArchive: false,
   * }}
   * ```
   */
  displayMode?: 'page' | 'embedded' | 'preview';
  /**
   * Controlled right-panel configuration.
   */
  previewConfig?: {
    /**
     * Controls whether the right panel is open.
     * The panel includes Workspace tool details and the fileViewer preview.
     */
    rightPanelVisible?: boolean;
    /**
     * Called when the right-panel visibility changes.
     * @param visible True when either Workspace or fileViewer is open.
     * @param trigger Source of the change: auto, user, or tool.
     */
    onRightPanelVisibleChange?: (visible: boolean, trigger: 'auto' | 'user' | 'tool') => void;
    /**
     * @deprecated Use the top-level senderConfig.sendDisabled option.
     */
    sendDisabled?: boolean;
    /**
     * @deprecated Use the top-level senderConfig.inputDisabled option.
     */
    inputDisabled?: boolean;
    /**
     * @deprecated Use the top-level senderConfig.sendDisabledTooltip option.
     */
    sendDisabledTooltip?: string;
  };
  /**
   * Custom welcome screen shown when no messages exist.
   * Accepts a ReactNode or a callback whose context provides send, disabled, and displayMode.
   */
  welcomeScreen?: React.ReactNode | ((context: WelcomeScreenContext) => React.ReactNode);
  /**
   * Start-screen configuration for embedded and preview modes.
   * @deprecated Use welcomeScreen.
   */
  startScreen?: StartScreenProps;
  /**
   * Preview start-screen configuration for preview and page modes.
   * @deprecated Use welcomeScreen.
   */
  previewScreen?: React.ReactNode | PreviewScreenProps;
  /**
   * Menu-item configuration.
   */
  menuItems?: AgentxMenuKey[];
  /**
   * Shows sender actions for the tools menu and knowledge bases.
   * @default false
   */
  showSenderActions?: boolean;
  /**
   * Input placeholder text.
   */
  placeholder?: string;

  /**
   * Reserved callback for received chunks. Not yet implemented.
   */
  onChunks?: (chunks: MessageChunk[]) => void;
  /**
   * Reserved callback for new messages. Not yet implemented.
   */
  onNewMessage?: (message: MessageItem) => void;
  /** Called when session information changes. */
  onSessionInfoChange?: (sessionInfo: SessionInfo) => void;
  /**
   * Reserved callback for tool-list updates. Not yet implemented.
   */
  onToolsUpdate?: (tools: any[]) => void;

  onStopped?: () => void;

  onSessionCreated?: (sessionInfo: SessionInfo) => void | Promise<void>;

  /**
   * Custom input options. Currently supports select only.
   */
  senderOptions?: SenderOptionConfig[];
}

export type HeaderNode =
  | React.ReactNode
  | ((components: {
      /**
       * Session-title component.
       */
      ChatTitle: React.ComponentType<ChatTitleProps>;
      /**
       * Component that lists files uploaded to the current session.
       */
      ChatFiles: React.ComponentType<ChatFilesProps>;
      /**
       * Starts a new chat.
       */
      newChat: () => void;

      sessionInfo?: SessionInfo;
    }) => React.ReactNode);
