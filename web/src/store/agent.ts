import { create } from 'zustand';
import {
  TaskStage,
  AgentMode,
  PlanStep,
  FileItem,
  KnowledgeBaseItem,
  MCPToolItem,
  MessageChunk,
  SessionInfo,
  E2BFile,
  MessageItem,
} from '@/types';
import { isFunction } from 'lodash-es';

interface AgentStore {
  // Agent基本信息
  agentId: string;
  setAgentId: (id: string) => void;
  sessionId: string;
  setSessionId: (id: string) => void;
  sessionInfo?: SessionInfo;
  setSessionInfo: (info?: SessionInfo) => void;
  basePath: string;
  backPath: string;
  setBasePath: (path: string) => void;
  setBackPath: (path: string) => void;
  mode: AgentMode;
  setMode: (mode: AgentMode) => void;

  // 分享信息
  shareId: string;
  setShareId: (id: string) => void;
  sharePassword: string;
  setSharePassword: (password: string) => void;

  // 导航标志 - 用于避免 navigate 导致的重复数据加载
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;

  // Agent数据消息, Message格式类型待定义后补充

  // 左边主流程数据
  pipelineMessages: MessageItem[];
  setPipelineMessages: (data: MessageItem[]) => void;

  // 左侧主流程 点击详情消息
  pipelineTargetMessage: any;
  setPipelineTargetMessage: (data: any) => void;
  // Workspace侧边栏数据
  workspaceMessages: any[];
  setWorkspaceMessages: (data: any[]) => void;

  // Workspace侧边栏显隐
  workspaceVisible: boolean;
  setWorkspaceVisible: (visible: boolean) => void;

  // Agent 任务相关信息

  // 任务状态机:  等待 -> 思考 -> 规划 -> 执行 -> 人机交互(可选) -> 成功 / 失败
  taskStage: TaskStage;
  setTaskStage: (status: TaskStage) => void;

  // 任务计划
  taskPlan: PlanStep[];
  setTaskPlan: (plan: PlanStep[]) => void;

  // Chunks 数据 - 新增
  chunks: MessageChunk[];
  setChunks: (chunks: MessageChunk[] | ((prev: MessageChunk[]) => MessageChunk[])) => void;
  addChunk: (chunk: MessageChunk) => void;
  clearChunks: () => void;

  // 输入框加载状态
  senderLoading: boolean;
  setSenderLoading: (loading: boolean) => void;
  // 输入框禁用状态
  // 暂时不使用，因为sessionInfo.status 可以判断是否可以发送
  // senderDisabled: boolean;
  // setSenderDisabled: (disabled: boolean) => void;
  // 输入框正在停止
  senderStopping: boolean;
  setSenderStopping: (stopping: boolean) => void;
  senderSending: boolean;
  setSenderSending: (sending: boolean) => void;
  // 输入框内容
  senderContent: string;
  setSenderContent: (value: string) => void;
  // 输入框文件
  senderFiles: FileItem[];
  setSenderFiles: (file: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  // 输入框知识库
  senderKnowledgeBases: KnowledgeBaseItem[];
  setSenderKnowledgeBases: (data: KnowledgeBaseItem[]) => void;
  // 输入框知识库选中项
  selectedSenderKnowledgeBases: KnowledgeBaseItem[];
  setSelectedSenderKnowledgeBases: (data: KnowledgeBaseItem[]) => void;
  // 输入框 MCP 工具
  senderMCPTools: MCPToolItem[];
  setSenderMCPTools: (data: MCPToolItem[]) => void;
  // 输入框 沙箱 工具
  senderSandboxTools: MCPToolItem[];
  setSenderSandboxTools: (data: MCPToolItem[]) => void;
  // 输入框 MCP 工具选中项
  selectedSenderMCPTools: MCPToolItem[];
  setSelectedSenderMCPTools: (data: MCPToolItem[]) => void;

  // FileViewer 文件
  fileViewerFile?: E2BFile | FileItem;
  setFileViewerFile: (file?: E2BFile | FileItem) => void;

  extraHeaders: Record<string, string>;
  setExtraHeaders: (headers: Record<string, string>) => void;

  requestPrefix: string;
  setRequestPrefix: (prefix: string) => void;

  previousSessionId: string;
  setPreviousSessionId: (id: string) => void;

  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;

  resetStore: () => void;
}

const useAgentStore = create<AgentStore>((set, get) => ({
  agentId: '',
  sessionId: '',
  sessionInfo: undefined,
  basePath: '',
  backPath: '',
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
  senderKnowledgeBases: [],
  selectedSenderKnowledgeBases: [],
  senderMCPTools: [],
  senderSandboxTools: [],
  selectedSenderMCPTools: [],
  fileViewerFile: undefined,
  extraHeaders: {},
  requestPrefix: '',
  previousSessionId: '',
  abortController: null,
  setPreviousSessionId: (id: string) => set({ previousSessionId: id }),
  setAgentId: (agentId: string) => set({ agentId }),
  setSessionId: (sessionId: string) => set({ sessionId }),
  setSessionInfo: (sessionInfo?: SessionInfo) => set({ sessionInfo }),
  setBasePath: (basePath: string) => set({ basePath }),
  setBackPath: (backPath: string) => set({ backPath }),
  setMode: (mode: AgentMode) => set({ mode }),

  setShareId: (shareId: string) => set({ shareId }),
  setSharePassword: (sharePassword: string) => set({ sharePassword }),
  setIsNavigating: (isNavigating: boolean) => set({ isNavigating }),
  setPipelineMessages: (pipelineMessages: MessageItem[]) => set({ pipelineMessages }),
  setPipelineTargetMessage: (pipelineTargetMessage: any) =>
    set({ pipelineTargetMessage, workspaceVisible: true, fileViewerFile: undefined }),
  setWorkspaceMessages: (workspaceMessages: any[]) => set({ workspaceMessages }),
  setWorkspaceVisible: (workspaceVisible: boolean) => set({ workspaceVisible, fileViewerFile: undefined }),

  setFileViewerFile: (fileViewerFile?: E2BFile) => set({ fileViewerFile, workspaceVisible: false }),
  setTaskStage: (taskStage: TaskStage) => set({ taskStage }),
  setTaskPlan: (taskPlan: PlanStep[]) => set({ taskPlan }),
  setChunks: (payload: MessageChunk[] | ((prev: MessageChunk[]) => MessageChunk[])) =>
    set(({ chunks }) => ({
      chunks: isFunction(payload) ? payload(chunks) : payload,
    })),
  addChunk: (chunk: MessageChunk) =>
    set(({ chunks }) => ({
      chunks: [...chunks, chunk],
    })),
  clearChunks: () => set({ chunks: [] }),
  setSenderLoading: (senderLoading: boolean) => set({ senderLoading }),
  setSenderStopping: (senderStopping: boolean) => set({ senderStopping }),
  setSenderSending: (senderSending: boolean) => set({ senderSending }),
  setSenderContent: (senderContent: string) => set({ senderContent }),
  setSenderFiles: (payload: FileItem[] | ((prev: FileItem[]) => FileItem[])) =>
    set(({ senderFiles }) => ({
      senderFiles: isFunction(payload) ? payload(senderFiles) : payload,
    })),
  setSenderKnowledgeBases: (senderKnowledgeBases: KnowledgeBaseItem[]) => set({ senderKnowledgeBases }),
  setSelectedSenderKnowledgeBases: (selectedSenderKnowledgeBases: KnowledgeBaseItem[]) =>
    set({ selectedSenderKnowledgeBases }),
  setSenderMCPTools: (senderMCPTools: MCPToolItem[]) => set({ senderMCPTools }),
  setSenderSandboxTools: (senderSandboxTools: MCPToolItem[]) => set({ senderSandboxTools }),
  setSelectedSenderMCPTools: (selectedSenderMCPTools: MCPToolItem[]) => set({ selectedSenderMCPTools }),
  setExtraHeaders: (extraHeaders: Record<string, string>) => set({ extraHeaders }),
  setRequestPrefix: (requestPrefix: string) => set({ requestPrefix }),
  setAbortController: (controller: AbortController | null) => set({ abortController: controller }),
  resetStore: () => {
    get().abortController?.abort();
    set({
      chunks: [],
      senderFiles: [],
      sessionInfo: undefined,
      senderLoading: false,
      senderStopping: false,
      senderSending: false,
      senderContent: '',
      fileViewerFile: undefined,
      taskPlan: [],
      pipelineMessages: [],
      pipelineTargetMessage: null,
      workspaceMessages: [],
      abortController: null,
      workspaceVisible: false,
    });
  },
}));

export default useAgentStore;
