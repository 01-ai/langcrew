import { StartScreenProps } from '@/components/Agent/Chatbot/StartScreen';
import { PreviewScreenProps, SessionInfo } from '@/sdk';
import type { ClientToolHandlers } from '@/sdk/clientTools';
import { FC } from 'react';
import type React from 'react';
import {
  E2BFile,
  FileUploadConfig,
  HitlActionRequest,
  KnowledgeBaseItem,
  AgentTool,
  Mention,
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
  /** Send a message (no-op when disabled). */
  send: (prompt: string) => void;
  /** Append text to the composer without sending. Useful for shortcut buttons. */
  appendText: (text: string) => void;
  /** Whether input is disabled (maps to senderConfig.inputDisabled). */
  disabled: boolean;
}

/** Layout and display options. */
export interface AgentLayoutConfig {
  /** Show the right-side Workspace panel. Default true. */
  showWorkspace?: boolean;
  /** Show the Home page when there is no session. Default true. */
  showHomePage?: boolean;
  /** Narrow layout: full-width bubbles and inline tool expansion. Default false. */
  narrowMode?: boolean;
  /** Header placement. Default 'outer'. */
  headerPosition?: 'outer' | 'inner';
}

/** Per-region className slots for AgentX. */
export interface AgentxClassNames {
  /** Outer wrapper of the conversation area (chat + workspace background, excludes Header). */
  conversationArea?: string;
}

/** Per-region style slots for AgentX. */
export interface AgentxStyles {
  conversationArea?: React.CSSProperties;
}

/** Session lifecycle behavior. */
export interface AgentSessionConfig {
  /** Navigate after creating a session. Default true. */
  enableRouting?: boolean;
  /** Auto-load session history when sessionId changes. Default true. */
  enableSessionLoading?: boolean;
  /** Auto-retry when the session is archived. Default false. */
  autoRetryOnArchive?: boolean;
  /** Show and submit like/dislike feedback. Default true. */
  enableFeedback?: boolean;
}

/** Composer behavior. Replaces send-control fields previously on previewConfig. */
export interface AgentSenderConfig {
  /** Composer height mode. Default multiLine. singleLine starts compact and grows with content. */
  inputMode?: 'multiLine' | 'singleLine';
  /** Disable the entire composer (text input and file upload). */
  inputDisabled?: boolean;
  /** Disable the send button only (text input stays enabled). */
  sendDisabled?: boolean;
  /** Tooltip shown when send is disabled. */
  sendDisabledTooltip?: string;
  /**
   * When a session already exists, still sync selectedKnowledgeBases into the composer.
   * Default false, to avoid overwriting selections restored from session history.
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

/** Mention chip render context: composer draft or message bubble. */
export type MentionRenderVariant = 'draft' | 'message';

export interface MentionRenderContext {
  mention: Mention;
  variant: MentionRenderVariant;
}

export interface MentionClickContext extends MentionRenderContext {
  event: React.MouseEvent;
}

/**
 * Host-provided mention interactions.
 * - getTooltip: hover content; omit or return empty to hide
 * - onClick: navigate or open details; omit to disable click
 */
export interface MentionConfig {
  getTooltip?: (context: MentionRenderContext) => React.ReactNode;
  onClick?: (context: MentionClickContext) => void;
}

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
  /** Tool name. Compatible with varying server detail shapes. */
  toolName: string;
  /** Raw, untransformed tool-result chunk. */
  chunk: MessageChunk;
  /** Session ID this result belongs to. */
  sessionId: string;
  /** Tool execution status. Undefined when the server omits it. */
  status?: string;
  /** Tool execution result. Undefined when the server omits it. */
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
  /** Currently clicked or selected file. */
  file: E2BFile | FileItem;
  /** Sibling attachments (e.g. multi-image navigation). */
  siblings: (E2BFile | FileItem)[];
  /** How the preview was triggered. */
  source: FilePreviewSource;
  /** Run AgentX built-in preview (workspace or narrow modal). */
  defaultPreview: () => void;
}

export interface FilePreviewConfig {
  office?: {
    /**
     * Custom Office preview URL builder.
     * @param fileUrl Original file URL
     * @returns URL the iframe can load directly
     */
    getPreviewUrl?: (fileUrl: string) => string;
  };
  /**
   * Custom file preview. When set, only this callback runs; built-in preview is skipped.
   * Call context.defaultPreview() to keep the built-in behavior.
   */
  onPreview?: (context: FilePreviewContext) => void;
  /**
   * Intercept auto-preview from useChunksUISync.
   * Default false: auto-open still uses built-in workspace preview.
   */
  interceptAutoPreview?: boolean;
}

/** Trace link config. Trace links are hidden when omitted. */
export interface AgentTraceConfig {
  /** Trace service project id. */
  projectId: string;
  /** Trace service base URL. */
  baseUrl: string;
}

export type AgentXDisplayMode = 'page' | 'embedded';

export interface AgentxProps<TMetadata extends MessageMetadata<any> = MessageMetadata> {
  /**
   * Whether to auto-open the right panel
   */
  autoOpenRightPanel?: boolean;
  /**
   * Disable right-side Workspace detail rendering.
   * Tool calls stay in the chat stream but do not open Workspace.
   */
  disableWorkspaceRendering?: boolean;
  /**
   * Whether clicking a file opens fullscreen preview.
   */
  fullscreenFilePreview?: boolean;
  /** Direct chat endpoint. When set, skip session creation and post here. */
  chatEndpoint?: string;
  /**
   * agentId
   */
  agentId?: string;
  /**
   * Compatibility display mode. Embedded mode keeps the conversation in the
   * current host and skips the standalone home-page transition.
   */
  displayMode?: AgentXDisplayMode;
  /**
   * sessionId
   */
  sessionId?: string;
  /** Session mode forwarded to the backend when creating a session. */
  sessionMode?: string;
  /**
   * Share id
   */
  shareId?: string;
  /**
   * Share password
   */
  sharePassword?: string;
  /**
   * Base path; in page mode navigates to `${basePath}/${agentId}/${sessionId}`
   */
  basePath?: string;
  /**
   * Unique AgentX instance id.
   * Same instanceKey shares a store; different keys isolate state and headers.
   * Defaults to `agent-${agentId}`; uses a neutral key when agentId is empty.
   */
  instanceKey?: string;
  /**
   * Custom Header node
   * Two forms:
   * 1. Pass a ReactNode directly
   * 2. Pass a render function that receives AgentX inner components
   */
  headerNode?: HeaderNode;
  /**
   * Custom Footer node
   */
  footerNode?: React.ReactNode;
  /**
   * Custom share-button node
   */
  shareButtonNode?: React.ReactNode;
  /**
   * Custom back-button node
   */
  backButtonNode?: React.ReactNode;
  /**
   * Knowledge-base list
   */
  knowledgeBases?: KnowledgeBaseItem[];
  /**
   * Skill-menu tool list supplied by the host.
   * Tool API `data`; may include MCP / SANDBOX / skills / widget, etc.
   */
  tools?: AgentTool[];
  /**
   * Model list
   */
  models?: ModelItem[];
  /**
   * Preselected model
   */
  selectedModels?: string[];
  /**
   * Preselected knowledge base
   */
  selectedKnowledgeBases?: string[];
  /**
   * API request path prefix
   */
  requestPrefix?: string;
  /**
   * Extra HTTP headers
   * Attached to every API request
   */
  extraHeaders?: Record<string, string>;
  /**
   * Optional host adapter for managed session APIs.
   * The open-source default transport keeps `/api/v1/chat` and only uses this
   * when the host explicitly opts in via capabilities.
   */
  requestAdapter?: import('@/services/requestClient').AgentXRequestAdapter;
  /** Capability flags that enable adapter-backed session APIs. */
  requestCapabilities?: import('@/services/requestClient').AgentXCapabilities;
  /** Legacy upload configuration retained for existing integrations. */
  fileUploadConfig?: FileUploadConfig;
  /**
   * UI language
   * @example 'zh-CN' | 'en-US'
   */
  language?: string;
  /**
   * Input content (controlled)
   * Synced into the input; use for prefill or external control
   */
  senderContent?: string;
  /**
   * Send-file config
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
   * Outgoing message business metadata, e.g. citation cards.
   * Sent as top-level request-body `metadata`.
   */
  senderMetadata?: TMetadata;
  /**
   * Custom message-metadata renderer. Defaults to AgentX built-in.
   */
  renderMessageMetadata?: RenderMessageMetadata<TMetadata>;
  /**
   * Mention chip interaction (hover tooltip / click navigation).
   * Implemented by the host; AgentX only triggers it.
   */
  mentionConfig?: MentionConfig;
  /**
   * Custom HITL tool-approval card. Host renders; AgentX still handles submit.
   */
  renderHitlApproval?: RenderHitlApproval;
  /**
   * Class name
   */
  className?: string;
  /**
   * Per-region className slots (finer than top-level className)
   */
  classNames?: AgentxClassNames;
  /**
   * Per-region style slots
   */
  styles?: AgentxStyles;
  /**
   * Home outer container className (page mode without session only)
   */
  homeClassName?: string;
  /**
   * Home content container className (page mode without session only)
   */
  homeContentClassName?: string;
  /**
   * Home sender container className (page mode without session only)
   */
  homeSenderClassName?: string;
  /**
   * Whether knowledge bases are read-only
   */
  knowledgeReadonly?: boolean;
  /**
   * Whether tools are read-only
   */
  toolReadonly?: boolean;
  /**
   * Whether file upload is disabled
   * When true, hides the upload button and disables paste-file
   */
  fileUploadDisabled?: boolean;
  /**
   * File preview config
   */
  filePreviewConfig?: FilePreviewConfig;
  /**
   * Trace link config. Hidden when omitted or incomplete.
   */
  traceConfig?: AgentTraceConfig;
  /**
   * Layout and display config
   */
  layoutConfig?: AgentLayoutConfig;
  /**
   * Session lifecycle behavior
   */
  sessionConfig?: AgentSessionConfig;
  /**
   * Input behavior config
   */
  senderConfig?: AgentSenderConfig;
  /** Per-instance client tool handlers; same names override the global registry. */
  clientToolHandlers?: ClientToolHandlers;
  /** Fired after any server tool-result chunk. */
  onToolResult?: (context: ToolResultContext) => void | Promise<void>;
  /** Fired after session history loads successfully. */
  onSessionLoaded?: (sessionInfo: SessionInfo, chunks: MessageChunk[]) => void | Promise<void>;
  /**
   * Controlled right-panel config
   */
  previewConfig?: {
    /**
     * Controlled whether the right panel is expanded
     * Right panel: workspace (tool detail), fileViewer, and citationPanel
     */
    rightPanelVisible?: boolean;
    /**
     * Right-panel expanded-state change callback
     * @param visible - Whether the right panel is visible (workspace, fileViewer, or citationPanel)
     * @param trigger - Source: 'auto' | 'user' | 'tool'
     */
    onRightPanelVisibleChange?: (visible: boolean, trigger: 'auto' | 'user' | 'tool') => void;
    /**
     * @deprecated Use top-level senderConfig.sendDisabled
     */
    sendDisabled?: boolean;
    /**
     * @deprecated Use top-level senderConfig.inputDisabled
     */
    inputDisabled?: boolean;
    /**
     * @deprecated Use top-level senderConfig.sendDisabledTooltip
     */
    sendDisabledTooltip?: string;
  };
  /**
   * Custom welcome screen (shown when there are no messages)
   * - ReactNode: render directly
   * - (context) => ReactNode: render callback; context provides send / disabled
   */
  welcomeScreen?: React.ReactNode | ((context: WelcomeScreenContext) => React.ReactNode);
  /**
   * Start-screen config
   * @deprecated Use welcomeScreen
   */
  startScreen?: StartScreenProps;
  /**
   * Preview start-screen config
   * @deprecated Use welcomeScreen
   */
  previewScreen?: React.ReactNode | PreviewScreenProps;
  /**
   * Menu item config
   */
  menuItems?: AgentxMenuKey[];
  /**
   * Whether to show sender actions (tool menu and knowledge base)
   * @default false
   */
  showSenderActions?: boolean;
  /**
   * Input placeholder
   */
  placeholder?: string;

  /**
   * Chunks received callback (reserved, not implemented)
   */
  onChunks?: (chunks: MessageChunk[]) => void;
  /**
   * New message callback (reserved, not implemented)
   */
  onNewMessage?: (message: MessageItem) => void;
  /** Session info update callback. */
  onSessionInfoChange?: (sessionInfo: SessionInfo) => void;
  /**
   * Tool-list update callback (reserved, not implemented)
   */
  onToolsUpdate?: (tools: any[]) => void;

  onStopped?: () => void;

  onSessionCreated?: (sessionInfo: SessionInfo) => void | Promise<void>;

  /**
   * Fired when clicking Manage Skills. Hidden if omitted.
   */
  onManageSkills?: () => void;

  /**
   * Custom input options (select only for now)
   */
  senderOptions?: SenderOptionConfig[];
}

export type AgentXProps<TMetadata extends MessageMetadata<any> = MessageMetadata> = AgentxProps<TMetadata>;
export type {
  AgentXCapabilities,
  AgentXRequestAdapter,
} from '@/services/requestClient';

export type HeaderNode =
  | React.ReactNode
  | ((components: {
      /**
       * Session title — current session title
       */
      ChatTitle: React.ComponentType<ChatTitleProps>;
      /**
       * Session file list — files already uploaded in this session
       */
      ChatFiles: React.ComponentType<ChatFilesProps>;
      /**
       * New-chat button
       */
      newChat: () => void;

      sessionInfo?: SessionInfo;
    }) => React.ReactNode);
