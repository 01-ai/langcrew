import { create } from 'zustand';
import { TaskStage, AgentMode, PlanStep, FileItem, MessageChunk, SessionInfo, E2BFile, MessageItem } from '@/types';
import { isFunction } from 'lodash-es';
import { transformChunksToMessages } from '@/hooks/useChat/utils';
import { devtools } from 'zustand/middleware';

interface AgentStore {
  sessionInfo?: SessionInfo;
  setSessionInfo: (info?: SessionInfo) => void;
  mode: AgentMode;
  setMode: (mode: AgentMode) => void;

  // 分享信息
  shareId: string;
  setShareId: (id: string) => void;
  sharePassword: string;
  setSharePassword: (password: string) => void;

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

  // FileViewer 文件
  fileViewerFile?: E2BFile | FileItem;
  setFileViewerFile: (file?: E2BFile | FileItem) => void;

  extraHeaders: Record<string, string>;
  setExtraHeaders: (headers: Record<string, string>) => void;

  requestPrefix: string;
  setRequestPrefix: (prefix: string) => void;

  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;

  resetStore: () => void;
}

const useAgentStore = create<AgentStore, [['zustand/devtools', never]]>(
  devtools((set, get) => ({
    sessionInfo: undefined,
    mode: AgentMode.Chatbot,
    shareId: '',
    sharePassword: '',
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
    fileViewerFile: undefined,
    extraHeaders: {},
    requestPrefix: '',
    abortController: null,
    setSessionInfo: (sessionInfo?: SessionInfo) => set({ sessionInfo }),
    setMode: (mode: AgentMode) => set({ mode }),

    setShareId: (shareId: string) => set({ shareId }),
    setSharePassword: (sharePassword: string) => set({ sharePassword }),
    setPipelineMessages: (pipelineMessages: MessageItem[]) => set({ pipelineMessages }),
    setPipelineTargetMessage: (pipelineTargetMessage: any) =>
      set({ pipelineTargetMessage, workspaceVisible: true, fileViewerFile: undefined }),
    setWorkspaceMessages: (workspaceMessages: any[]) => set({ workspaceMessages }),
    setWorkspaceVisible: (workspaceVisible: boolean) => set({ workspaceVisible, fileViewerFile: undefined }),

    setFileViewerFile: (fileViewerFile?: E2BFile) => set({ fileViewerFile, workspaceVisible: false }),
    setTaskStage: (taskStage: TaskStage) => set({ taskStage }),
    setTaskPlan: (taskPlan: PlanStep[]) => set({ taskPlan }),
    setChunks: (payload: MessageChunk[] | ((prev: MessageChunk[]) => MessageChunk[])) => {
      const newChunks = isFunction(payload) ? payload(get().chunks) : payload;
      const newMessages = transformChunksToMessages(newChunks);
      set({ pipelineMessages: newMessages, chunks: newChunks });
    },
    addChunk: (chunk: MessageChunk) => {
      const newChunks = [...get().chunks, chunk];
      const newMessages = transformChunksToMessages([chunk], get().pipelineMessages);
      set({ pipelineMessages: newMessages, chunks: newChunks });
    },
    clearChunks: () => set({ chunks: [] }),
    setSenderLoading: (senderLoading: boolean) => set({ senderLoading }),
    setSenderStopping: (senderStopping: boolean) => set({ senderStopping }),
    setSenderSending: (senderSending: boolean) => set({ senderSending }),
    setSenderContent: (senderContent: string) => set({ senderContent }),
    setExtraHeaders: (extraHeaders: Record<string, string>) => set({ extraHeaders }),
    setRequestPrefix: (requestPrefix: string) => set({ requestPrefix }),
    setAbortController: (controller: AbortController | null) => set({ abortController: controller }),
    resetStore: () => {
      get().abortController?.abort();
      set({
        chunks: [],
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
  })),
);

export default useAgentStore;
