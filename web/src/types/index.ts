import { FC } from 'react';
import { WidgetData } from './widget';

export * from './agentx';
export * from './widget';

export enum TaskStage {
  Pending,
  Thinking,
  Planning,
  Executing,
  Hitl,
  Success,
  Failure,
}

export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Error = 'error',
}

export enum AgentMode {
  Chatbot,
  Replay,
}

export type CitationSourceType = 'web' | 'knowledge' | 'file' | 'memory' | 'unknown';

export interface BaseCitationSource {
  id: string;
  type: CitationSourceType;
}

export interface WebCitationSource extends BaseCitationSource {
  type: 'web';
  title: string;
  url: string;
  site_name?: string;
  favicon_url?: string;
  published_at?: string | null;
  snippet: string;
}

export interface BaseKnowledgeCitationSource extends BaseCitationSource {
  type: 'knowledge';
  source: 'knowledge' | 'qa_knowledge';
  knowledge_id: string;
  knowledge_name: string;
  content: string;
  updated_at?: string | null;
}

export interface DocumentKnowledgeCitationSource extends BaseKnowledgeCitationSource {
  source: 'knowledge';
  document_id: string;
  document_name: string;
  chunk_id: string;
}

export interface QAKnowledgeCitationSource extends BaseKnowledgeCitationSource {
  source: 'qa_knowledge';
  qa_id: string;
  question: string;
}

export type KnowledgeCitationSource =
  | DocumentKnowledgeCitationSource
  | QAKnowledgeCitationSource;

export interface FileCitationSource extends BaseCitationSource {
  type: 'file';
  filename: string;
  key: string;
  url: string;
  size: number;
  content_type: string;
}

export interface MemoryCitationSource extends BaseCitationSource {
  type: 'memory';
  memory_id: string;
  source_name?: string;
  content: string;
}

export interface UnknownCitationSource extends BaseCitationSource {
  type: 'unknown';
  title?: string;
  url?: string;
  content?: string;
}

export type CitationSource =
  | WebCitationSource
  | KnowledgeCitationSource
  | FileCitationSource
  | MemoryCitationSource
  | UnknownCitationSource;

export type FeedbackType = 'like' | 'dislike';

export interface ConversationFeedback {
  feedback_type: FeedbackType;
  reason_codes: string[];
  comment: string | null;
}

export type FeedbackMap = Record<string, ConversationFeedback>;

export interface MessageItem {
  id?: string;
  role: 'user' | 'assistant';
  messages: MessageChunk[];
  isLast?: boolean;
  trace_id?: string | null;
  /** Citation sources collected for this assistant turn. */
  citations?: CitationSource[];
  /** Agent SSE response id used for feedback; absent when the turn has no response_id. */
  responseId?: string;
}

export interface ReferenceCardMetadata {
  type?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  payload?: Record<string, unknown>;
  [key: string]: any;
}

export type MessageReferenceMetadata = ReferenceCardMetadata | ReferenceCardMetadata[];

export interface MessageMetadata<TReference = MessageReferenceMetadata> {
  reference?: TReference;
  [key: string]: any;
}

/** Mention entity types supported in the composer / message payload. */
export type MentionType = 'session' | 'tool';

/**
 * Structured @mention bound to a token in `content`.
 * Example token: `@session:123` / `@tool:mysql`
 */
export interface Mention {
  token: string;
  type: MentionType;
  id: string;
  label: string;
}

/** Programmatic composer value: plain text plus optional mention metadata. */
export interface SenderInputValue {
  content: string;
  mentions?: Mention[];
}

export interface MessageChunk {
  id?: string | number;
  role?: 'user' | 'assistant' | 'inner_message';
  type: string;
  content: string;
  step_id?: string;
  timestamp?: number;
  /**
   * Followed by user input or finish_reason; this chunk batch is complete
   */
  isFinish?: boolean;
  /**
   * After this, no further user input
   */
  isLast?: boolean;
  /**
   * Placeholder message while waiting for a response (loading)
   */
  loading?: boolean;
  detail?: {
    attachments?: E2BFile[];
    files?: FileItem[];
    metadata?: MessageMetadata;
    mentions?: Mention[];
    citation_sources?: CitationSource[];
    [key: string]: any;
  };
  metadata?: MessageMetadata;
  /** Optional root-level citation sources retained for compatibility. */
  citations?: CitationSource[];

  is_llm_message?: boolean;
  session_id?: string;
  task_id?: string;
  response_id?: string | null;
  trace_id?: string | null;

  field_name?: string;
}

export interface TaskCreateChunk extends MessageChunk {
  type: 'task.creation';
  content: string;
  result: any;
}

// Plan before processing
export interface EventPlanChunk extends MessageChunk {
  type: 'plan';
  content: string;
  detail?: {
    steps: PlanStep[];
  };
}
// Plan after processing
export interface MessagePlanChunk extends MessageChunk {
  type: 'plan';
  content: string;
  children: PlanStep[];
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  children: MessageChunk[];
}

export interface PlanUpdateChunk extends MessageChunk {
  type: 'plan_update';
  content: string;
  detail?: {
    action?: 'add' | 'update' | 'remove';
    steps?: PlanStep[];
  };
}

// File upload
export interface FileItem {
  uid: string;
  status: 'done' | 'uploading' | 'error';
  name: string;
  key: string;
  url?: string;
  size?: number;
  type?: string;
  originFileObj?: File;
}

/** Legacy public upload configuration retained for backwards compatibility. */
export interface FileUploadConfig {
  accept?: string;
  maxSize?: number;
  maxCount?: number;
  multiple?: boolean;
  customUploadRequest?: (file: File) => Promise<string>;
}

export interface SenderFilesConfig {
  maxLength: number;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  customUploadRequest?: (file: File) => Promise<string>;
  onRemove?: (file?: FileItem) => void;
  beforeUpload?: (fileList: File[], file: File) => boolean;
  Button?: FC<any> | null;
}

// Tool calls before and after processing
export interface MessageToolChunk extends MessageChunk {
  type: string;
  content: string;
  title?: string;
  // Tool display name on the page; falls back to "tool"
  display_name?: string;
  detail?: {
    tool?: string;
    action?: string;
    action_content?: string;
    // detail_content?: string;
    // Tool params
    param?: {
      // Tool id
      tool_id?: string;
      [key: string]: any;
    };
    // Tool output
    result?: {
      // 1:1 with tool_call.detail.param.tool_id
      tool_use_id?: string;
      artifact?: any;
      content?: string;
      content_type?: string; // Content type, e.g. 'text/plain', 'text/markdown', 'application/json'
      image_url?: string;
      sandbox_url?: string;
      auth_info?: CloudPhoneAuthInfo;
      // New LangChain ToolMessage envelope fields
      additional_kwargs?: Record<string, any>;
      response_metadata?: Record<string, any>;
      type?: string;
      name?: string;
      id?: string | null;
      tool_call_id?: string;
      status?: string;
    };
    status?: TaskStatus;
    run_id?: string;
  };
}

// FileReader type
export interface FileReaderChunk extends MessageChunk {
  detail: {
    uid: string;
    name: string;
    size?: number;
    thumbUrl?: string;
    url?: string;
  };
}

export interface FileDetailProps extends MessageChunk {
  message: MessageToolChunk;
}

// Knowledge base
export interface KnowledgeBaseItem {
  instance_id: string;
  app_id: string;
  instance_name: string;
  instance_host: string;
  index_name: string;
  name: string;
  knowledge_id: string;
  knowledge_type: string;
  description: string | null;
  create_time: string;
  update_time: string;
  create_user: string;
  doc_cnt?: number | null;
  task_cnt?: number | null;
  member_cnt?: number | null;
  is_editable?: boolean;
  is_public?: boolean;
  role: string;
  sync_next_time: string;
  sync_period: string;
  visible_range: number;
}

export interface AgentTool {
  id: string;
  name: string;
  icon: string;
  brief_introduction: string;
  details: string;
  need_config: boolean;
  agent_tool_id: string;
  type: 'MCP' | 'API' | 'SANDBOX' | 'builtin' | 'workflow' | 'skills' | 'widget';
  status?: 'ACTIVE' | 'COMING' | 'INACTIVE';
  ext: {
    name_en: string;
    desc_en: string;
  };
  config?: any;
}

/** Legacy MCP tool shape retained for existing consumers. */
export interface MCPToolItem {
  id: string;
  name: string;
  icon: string;
  brief_introduction: string;
  details: string;
  need_config: boolean;
  agent_tool_id?: string;
  status?: 'ACTIVE' | 'COMING' | 'INACTIVE';
  ext: {
    name_en: string;
    brief_introduction_en?: string;
    desc_en?: string;
  };
}

export interface SandboxToolItem {
  id: number;
  agent_tool_id: string;
  tool_type: string;
  tool_name: string;
  status: string;
  avatar: string;
  desc: string;
  location: string;
  tool_name_en: string;
  desc_en: string;
}

export interface WebSearchResultItem {
  title: string;
  text: string;
  metadata: WebSearchResultMetadata;
  num: number;
  connector_name: string;
}

export interface WebSearchResultMetadata {
  snippet: string;
  score: number;
  engine: string;
  date_published: string;
  favicon: string;
  is_full_text: boolean;
  url: string;
}

export interface SessionInfo {
  session_id: string;
  title: string;
  /**
   * ACTIVE: normal
   * ARCHIVED: conversation cannot continue
   * INEXECUTIVE: currently executing
   */
  status: 'ACTIVE' | 'ARCHIVED' | 'INEXECUTIVE';
  agent_tool_info?: AgentToolInfo;
  /**
   * Super-employee id (may be empty)
   */
  super_employee_id?: string;
  /**
   * Session mode from the backend (may be empty)
   */
  mode?: string;
  /**
   * Risk-control config (may be null)
   */
  guardrail_config?: any | null;
  /**
   * Knowledge-base retrieval config (may be null)
   */
  knowledge_query_request?: KnowledgeQueryRequest | null;
  create_time?: string;
  update_time?: string;
  /**
   * Selected model info for display
   * Format: { "id": "model-id", "model_display_name": "Model Name" }
   * Optional; omitted when not configured
   */
  model?: {
    id: string;
    model_display_name: string;
  };
  general_agent_mode?: string;
}

export interface KnowledgeQueryRequest {
  knowledge_ids: string[];
  kb_names: string[] | null;
  kb_descriptions: string[] | null;
  query: string | null;
  topK: number;
  query_type: number;
  weight: number;
  rerank: boolean;
  score: number;
}

export interface KbInfo {
  kb_ids: string[];
}

export interface AgentToolInfo {
  agent_tool_items: AgentToolItem[];
}

export interface AgentToolItem {
  agent_tool_id: string;
  agent_tool_type: string;
}

export interface E2BFile {
  filename: string;
  path: string;
  url: string;
  size: number;
  content_type: string;
  show_user?: 0 | 1;
  last_modified?: string;
}

export interface ServiceDeployContent {
  success?: boolean;
  preview_url?: string;
  domain_url?: string;
  website_name?: string;
  service_name?: string;
  message?: string;
}

export interface EventErrorChunk {
  code?: number;
  message?: string;
}

export interface SessionInitChunk extends MessageChunk {
  type: 'session_init';
  detail: {
    session_id: string;
    title: string;
  };
}

export interface AntdUploadFile extends File {
  uid: string;
  name: string;
  size: number;
  type: string;
}

export interface FormFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'multiselect';
  title: string;
  description?: string;
  enum?: string[];
  required?: boolean;
  format?: 'email' | 'url' | 'date' | 'date-time' | 'phone' | 'color' | 'time';
  pattern?: string; // Regular-expression pattern
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: any;
  items?: {
    type: 'string' | 'number' | 'boolean';
    enum?: string[];
  };
  // Multi-select fields
  multiselect?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface FormSchema {
  type: 'object';
  properties: Record<string, FormFieldSchema>;
  required?: string[];
  title?: string;
  description?: string;
}

export interface CloudPhoneAuthInfo {
  instance_no: string;
  access_key: string;
  access_secret_key: string;
  user_id: string;
  expire_time: string;
}

export type UserInputQuestionType = 'text' | 'single_select' | 'multi_select' | 'approval';

export type HitlApprovalDecision = { type: 'approve' } | { type: 'reject'; message?: string };

export interface HitlApprovalResumeContent {
  decisions: HitlApprovalDecision[];
}

export interface HitlActionRequest {
  name: string;
  args?: Record<string, any>;
  description?: string;
}

export interface HitlReviewConfig {
  action_name: string;
  allowed_decisions: Array<HitlApprovalDecision['type']>;
}

export interface UserInputChunk extends MessageChunk {
  type: 'user_input';
  content: string;
  detail?: {
    options?: string[];
    interrupt_data: {
      type?: 'user_input' | 'take_over_browser' | 'take_over_phone' | 'dynamic_form';
      suggested_user_action?: 'take_over_browser' | 'take_over_phone' | 'fill_form';
      question_type?: UserInputQuestionType;
      question?: string;
      options?: string[];
      action_requests?: HitlActionRequest[];
      review_configs?: HitlReviewConfig[];
      form_schema?: FormSchema;
      intervention_info?: {
        scene: 'phone' | 'browser';
        intervention_url?: string;
        auth_info?: CloudPhoneAuthInfo;
      };
      [key: string]: any;
    };
  };
}

export interface FinishReasonChunk extends MessageChunk {
  type: 'finish_reason';
  content: string;
  detail?: {
    reason: string;
    status: 'success' | 'completed' | 'failed' | 'cancelled' | 'abnormal' | 'user_input';
  };
}

export interface InnerMessageChunk extends MessageChunk {
  role: 'inner_message';
  type: 'config' | 'client_tool_result';
  detail: {
    session_id?: string;
    sandbox_id?: string;
    instance_no?: string;
    access_key?: string;
    access_secret_key?: string;
    expire_time?: string;
    user_id?: string;
  };
}

// =============== ChatKit types and handlers ===============
export interface ChatkitWidgetChunkDetail {
  // type: 'thread.created' | 'thread.item.added' | 'thread.item.updated' | 'thread.item.done';
  // event_type?: 'added' | 'done';
  type?: 'added' | 'done' | 'updated' | 'removed' | 'replaced' | 'update';
  update_type?: 'streaming_text_delta' | 'component_updated' | 'root_updated';
  item_id?: string;
  widget?: WidgetData;
  copy_text?: string;
  langcrew_task?: string;

  component_id?: string;
  delta?: string;
  done?: boolean;

  // thread?: any;
  // item?: any;
  // update?: {
  //   type: string;
  //   content_index?: number;
  //   delta?: string;
  //   content?: any;
  // };
}

export interface JsxJson {
  type: string;
  key?: string;
  children?: JsxJson[];
  [key: string]: any;
}

export interface ClientToolCallChunk extends MessageChunk {
  type: 'client_tool_call';
  detail: {
    call_id: string;
    name: string;
    arguments: any;
    status: string;
    wait_for_result?: boolean;
  };
}

// Model selector types
export interface ModelItem {
  id: string;
  model_display_name: string;
  icon: string;
  is_default?: number; // 0 or 1; 1 means selected by default
  ext?: {
    name?: string;
    name_en?: string;
    feature?: string;
    feature_en?: string;
    desc?: string;
    desc_en?: string;
  };
}

export interface WidgetComponent {
  id?: string;
  value?: string;
  children?: WidgetComponent[];
  [key: string]: any;
}
