import { MessageChunk, MessageItem, MessagePlanChunk, PlanStep, TaskStatus } from '@/types';
import { getTranslation } from '../../useTranslation';
import { isPlanChunk } from './planHandlers';

/**
 * Remove live_status messages.
 */
export function filterLiveStatus(message: MessageItem) {
  message.messages = message.messages
    .filter((msg) => msg.type !== 'live_status')
    .map((msg) => {
      if (isPlanChunk(msg)) {
        const plan = msg as MessagePlanChunk;
        plan.children = plan.children.map((step) => {
          step.children = step.children.filter((child) => child.type !== 'live_status');
          return step;
        });
        return plan;
      }
      return msg;
    });
  return message;
}

/**
 * Mark every step in a plan message as successful.
 */
export function changePlanStepStatusToSuccess(message: MessageItem) {
  message.messages.forEach((msg) => {
    if (isPlanChunk(msg)) {
      (msg as MessagePlanChunk).children.forEach((step: PlanStep) => {
        if (step.status === TaskStatus.Running) {
          step.status = TaskStatus.Success;
        }
      });
    }
  });
  return message;
}

/**
 * Remove the isLast flag from a message.
 */
export function removeIsLast(message: MessageItem) {
  message.messages = message.messages.map((msg) => {
    if (msg.isLast !== undefined) {
      delete msg.isLast;
    }
    if (msg.type === 'plan') {
      (msg as MessagePlanChunk).children?.forEach((step) => {
        step.children?.forEach((child) => {
          if (child.isLast !== undefined) {
            delete child.isLast;
          }
        });
      });
    }
    return msg;
  });
  return message;
}

/**
 * Create a loading message.
 */
export const getLoadingMessage = () => {
  return {
    role: 'assistant',
    messages: [
      {
        type: 'live_status',
        content: getTranslation('chatbot.task.thinking'),
      },
    ],
  } as MessageItem;
};

/**
 * Check whether a message is finished.
 */
export const isMessageFinish = (message: MessageItem) => {
  return message.messages.some((msg) => isFinishChunk(msg));
};

/**
 * Check whether a chunk has a finish type.
 */
export function isFinishChunk(chunk: MessageChunk) {
  return ['agent_end_task', 'error', 'finish_reason', 'client_tool_call'].includes(chunk.type);
}




/**
 * Find a chunk containing interrupt_data in top-level messages or plan-step children.
 * @param messageItem Message item to search.
 * @returns The chunk containing interrupt_data, or undefined when none exists.
 */
export const findInterruptDataChunk = (messageItem: MessageItem | undefined): MessageChunk | undefined => {
  if (!messageItem?.messages) return undefined;

  // Search top-level messages first.
  const directChunk = messageItem.messages.find((msg) => msg.detail?.interrupt_data);
  if (directChunk) return directChunk;

  // Then search plan-step children.
  for (const msg of messageItem.messages) {
    if (isPlanChunk(msg)) {
      const planChunk = msg as MessagePlanChunk;
      for (const step of planChunk.children || []) {
        const childChunk = (step as PlanStep).children?.find((child) => child.detail?.interrupt_data);
        if (childChunk) return childChunk;
      }
    }
  }

  return undefined;
};

export const hasActiveHitlApprovalRequest = (messageItem: MessageItem | undefined): boolean => {
  if (messageItem?.role !== 'assistant') return false;

  const interruptData = findInterruptDataChunk(messageItem)?.detail?.interrupt_data;
  return Array.isArray(interruptData?.action_requests) && interruptData.action_requests.length > 0;
};
