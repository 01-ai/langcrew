import { MessageChunk, MessageItem, PlanStep } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface RequiredAction {
  type: 'input' | 'operate_phone';
}

interface ChatState {
  /**
   * 格式化过的消息列表，用于展示在左侧消息列表区域
   */
  messages: MessageItem[];
  setMessages: (messages: MessageItem[]) => void;
  /**
   * 是否需要用户操作，比如发送“继续”，或者点击“继续”按钮
   */
  requiredAction: RequiredAction | null;
  setRequiredAction: (requiredAction: RequiredAction | null) => void;

  /**
   * 有内容的消息列表，用于展示在右侧详情区域
   */
  detailList: MessageChunk[];
  setDetailList: (detailList: MessageChunk[]) => void;

  /**
   * 最新plan, 展示在页面右下角
   */
  latestPlan: PlanStep[];
  setLatestPlan: (latestPlan: PlanStep[]) => void;

  resetState: () => void;
}

const useChatStore = create<ChatState, [['zustand/devtools', never]]>(
  devtools((set, get) => ({
    messages: [],
    setMessages: (messages: MessageItem[]) => {
      set({ messages });
    },
    requiredAction: null,
    setRequiredAction: (requiredAction: RequiredAction | null) => {
      set({ requiredAction });
    },
    detailList: [],
    setDetailList: (detailList: MessageChunk[]) => {
      set({ detailList });
    },
    latestPlan: [],
    setLatestPlan: (latestPlan: PlanStep[]) => {
      set({ latestPlan });
    },
    resetState: () => {
      set({
        messages: [],
        requiredAction: null,
        detailList: [],
      });
    },
  })),
);

export default useChatStore;
