import { AgentMode, type ConversationFeedback, type MessageItem } from '@/types';

const HIDDEN_OUTPUT_TYPES = new Set([
  'reasoning',
  'tool_call',
  'tool_result',
  'live_status',
  'finish_reason',
  'client_tool_call',
]);

export const hasVisibleResponseOutput = (message: MessageItem): boolean => {
  return message.messages.some((chunk) => {
    if (HIDDEN_OUTPUT_TYPES.has(chunk.type)) {
      return false;
    }
    if (chunk.type === 'widget' || chunk.type === 'plan') {
      return true;
    }
    if (chunk.detail?.attachments?.length || chunk.detail?.files?.length) {
      return true;
    }
    return Boolean(chunk.content?.trim());
  });
};

export const shouldShowFeedback = (
  message: MessageItem,
  options: {
    enableFeedback?: boolean;
    mode: AgentMode;
    shareId?: string;
    hasUserInput: boolean;
  },
): boolean => {
  if (!options.enableFeedback) {
    return false;
  }
  if (options.mode !== AgentMode.Chatbot) {
    return false;
  }
  if (options.shareId) {
    return false;
  }
  if (!message.responseId) {
    return false;
  }
  if (options.hasUserInput) {
    return false;
  }
  const finishReason = [...message.messages].reverse().find((chunk) => chunk.type === 'finish_reason');
  if (!finishReason) {
    return false;
  }
  if ((finishReason.detail?.status || 'completed') === 'user_input') {
    return false;
  }
  return hasVisibleResponseOutput(message);
};

export const isFeedbackPermissionError = (error: unknown): boolean => {
  const code = (error as { code?: string | number } | undefined)?.code;
  return code === 'USER_NO_PERMISSION';
};

export const isConversationFeedback = (value: unknown): value is ConversationFeedback => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const type = (value as ConversationFeedback).feedback_type;
  return type === 'like' || type === 'dislike';
};
