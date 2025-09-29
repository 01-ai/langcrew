import { FileReaderProps } from '@/components/Infra/FileReader';
import { UploadFile } from 'antd';

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
  trace_id?: string;
}

export interface MessageChunk {
  id?: string;
  role?: 'user' | 'assistant' | 'inner_message';
  type: string;
  content: string;
  step_id?: string;
  timestamp?: number;
  /**
   * Indicates this batch of chunks is complete when followed by user input or finish_reason
   */
  isFinish?: boolean;
  /**
   * No more user input after this point
   */
  isLast?: boolean;
  /**
   * Fake message sent but not yet returned, showing loading state
   */
  loading?: boolean;
  detail?: {
    attachments?: E2BFile[];
    files?: FileItem[];
    [key: string]: any;
  };

  is_llm_message?: boolean;
  session_id?: string;
  task_id?: string;

  trace_id?: string;
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
}

// Tool calls before and after processing
export interface MessageToolChunk extends MessageChunk {
  type: string;
  content: string;
  title?: string;
  // Display name of the tool on the page, defaults to "tool" if not provided
  display_name?: string;
  detail?: {
    tool?: string;
    action?: string;
    action_content?: string;
    // detail_content?: string;
    // Tool parameters
    param?: any;
    // Tool output
    result?: {
      content?: string;
      content_type?: string; // Content type, such as 'text/plain', 'text/markdown', 'application/json', etc.
      image_url?: string;
      sandbox_url?: string;
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
  description: string;
  create_time: string;
  update_time: string;
  create_user: string;
  doc_cnt: any;
  task_cnt: any;
  is_public: boolean;
  is_editable: boolean;
  knowledge_type: string;
  sync_period: string;
  sync_next_time: string;
  role: string;
  member_cnt: any;
}

// MCP
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
    brief_introduction_en: string;
  };

  // id: string | number;
  // name?: string;
  // icon?: string;
  // details?: string;

  // // Below are security sandbox properties
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
   * ARCHIVED: Cannot continue conversation
   * INEXECUTIVE: Currently executing
   */
  status: 'ACTIVE' | 'ARCHIVED' | 'INEXECUTIVE';
  kb_info: KbInfo;
  agent_tool_info: AgentToolInfo;
  create_time: string;
  update_time: string;
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
  show_user: 0 | 1;
}

export interface ServiceDeployContent {
  success?: boolean;
  domain_url?: string;
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
  pattern?: string; // Regular expression pattern
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: any;
  items?: {
    type: 'string' | 'number' | 'boolean';
    enum?: string[];
  };
  // Multi-select related fields
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

export interface UserInputChunk extends MessageChunk {
  type: 'user_input';
  content: string;
  detail?: {
    options?: string[];
    interrupt_data: {
      type: 'user_input' | 'take_over_browser' | 'take_over_phone' | 'dynamic_form';
      suggested_user_action?: 'take_over_browser' | 'take_over_phone' | 'fill_form';
      question: string;
      form_schema?: FormSchema;
      intervention_info?: {
        intervention_url?: string;
      };
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
  type: 'config';
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
