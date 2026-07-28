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

export interface MessageItem {
  id?: string;
  role: 'user' | 'assistant';
  messages: MessageChunk[];
  trace_id?: string | null;
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

export interface MessageChunk {
  id?: string | number;
  role?: 'user' | 'assistant' | 'inner_message';
  type: string;
  content: string;
  step_id?: string;
  timestamp?: number;
  /**
   * There's a user input behind, or...finish_reason，Mark this.chunkIt's complete.
   */
  isFinish?: boolean;
  /**
   * No user input for the next one
   */
  isLast?: boolean;
  /**
   * False message. Send it back.loading
   */
  loading?: boolean;
  detail?: {
    attachments?: E2BFile[];
    files?: FileItem[];
    metadata?: MessageMetadata;
    [key: string]: any;
  };
  metadata?: MessageMetadata;

  is_llm_message?: boolean;
  session_id?: string;
  task_id?: string;
  trace_id?: string | null;

  field_name?: string;
}

export interface TaskCreateChunk extends MessageChunk {
  type: 'task.creation';
  content: string;
  result: any;
}

// Pre-processedplan
export interface EventPlanChunk extends MessageChunk {
  type: 'plan';
  content: string;
  detail?: {
    steps: PlanStep[];
  };
}
// After processingplan
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

// Uploading of files
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

export interface SenderFilesConfig {
  maxLength: number;
  accept?: string;
  onRemove?: (file?: FileItem) => void;
  beforeUpload?: (fileList: File[], file: File) => boolean;
  Button?: FC<any> | null;
}

// Tool call before and after processing
export interface MessageToolChunk extends MessageChunk {
  type: string;
  content: string;
  title?: string;
  // The name of the display on the page of the tool, if not, is displayedtool
  display_name?: string;
  detail?: {
    tool?: string;
    action?: string;
    action_content?: string;
    // detail_content?: string;
    // Tool Parameters
    param?: {
      // Toolid
      tool_id?: string;
      [key: string]: any;
    };
    // Tool Output
    result?: {
      // and tool_call.detail.param.tool_id - One-on-one.
      tool_use_id?: string;
      artifact?: any;
      content?: string;
      content_type?: string; // Type of content, e.g. 'text/plain', 'text/markdown', 'application/json' Wait.
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

// FileReaderType
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

// MCP
export interface MCPToolItem {
  id: string;
  name: string;
  icon: string;
  brief_introduction: string;
  details: string;
  need_config: boolean;
  agent_tool_id: string;
  type: 'MCP' | 'API' | 'SANDBOX' | 'builtin' | 'workflow';
  status?: 'ACTIVE' | 'COMING' | 'INACTIVE';
  ext: {
    name_en: string;
    desc_en: string;
  };
  config?: any;

  // id: string | number;
  // name?: string;
  // icon?: string;
  // details?: string;

  // // Here's the security box.
  // agent_tool_id?: string;
  // tool_type?: 'SANDBOX';
  // tool_name?: string;
  // status?: 'ACTIVE' | 'COMING';
  // avatar?: string;
  // desc?: string;
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
   * ACTIVE: Normal
   * ARCHIVED: We can't continue the conversation.
   * INEXECUTIVE: Under implementation
   */
  status: 'ACTIVE' | 'ARCHIVED' | 'INEXECUTIVE';
  agent_tool_info?: AgentToolInfo;
  /**
   * Superworkers.ID（Could be an empty string)
   */
  super_employee_id?: string;
  /**
   * Session mode (backend down, probably empty string)
   */
  mode?: string;
  /**
   * Wind Control Configuration (possibly for null）
   */
  guardrail_config?: any | null;
  /**
   * Knowledge base search configuration (possibly as null）
   */
  knowledge_query_request?: KnowledgeQueryRequest | null;
  create_time?: string;
  update_time?: string;
  /**
   * User-selected model information for replay
   * Format:{ "id": "model-id", "model_display_name": "Model Name" }
   * optional fields, not available if not configured
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

export interface AntdUploadFile {
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
  pattern?: string; // Regular expression mode
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: any;
  items?: {
    type: 'string' | 'number' | 'boolean';
    enum?: string[];
  };
  // Multiple selection of relevant fields
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

// =============== ChatKit Type definition and processing function ===============
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

// Model Chooser Related Type
export interface ModelItem {
  id: string;
  model_display_name: string;
  icon: string;
  is_default?: number; // 0 or 1，1Express Default Selection
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
