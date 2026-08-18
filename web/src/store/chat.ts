import { MessageChunk, MessageItem, PlanStep } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface RequiredAction {
  type: 'input' | 'operate_phone';
}

interface ChatState {
  /**
   * Formatted messages for the left message list
   */
  messages: MessageItem[];
  setMessages: (messages: MessageItem[]) => void;
  /**
   * Whether user action is required, e.g. send or click Continue
   */
  requiredAction: RequiredAction | null;
  setRequiredAction: (requiredAction: RequiredAction | null) => void;

  /**
   * Messages with content, shown in the right detail pane
   */
  detailList: MessageChunk[];
  setDetailList: (detailList: MessageChunk[]) => void;

  /**
   * Latest plan, shown at the bottom-right
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
