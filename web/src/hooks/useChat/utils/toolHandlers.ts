import { MessageToolChunk } from '@/types';

/**
 * Judgement tool_call and tool_result Whether to match
 */
export function isPair(toolCallChunk: MessageToolChunk, toolResultChunk: MessageToolChunk) {
  if (
    toolCallChunk?.type !== toolResultChunk?.detail?.tool &&
    toolCallChunk?.detail?.tool !== toolResultChunk?.detail?.tool
  ) {
    return false;
  }
  // New schema: match via tool_call_id from LangChain ToolMessage envelope
  if (
    toolCallChunk?.detail?.param?.tool_id &&
    toolResultChunk?.detail?.result?.tool_call_id &&
    toolCallChunk?.detail?.param?.tool_id === toolResultChunk?.detail?.result?.tool_call_id
  ) {
    return true;
  }
  if (
    toolCallChunk?.detail?.param?.tool_id &&
    toolResultChunk?.detail?.result?.tool_use_id &&
    toolCallChunk?.detail?.param?.tool_id === toolResultChunk?.detail?.result?.tool_use_id
  ) {
    return true;
  }
  if (
    !!toolCallChunk?.detail?.tool &&
    !!toolResultChunk?.detail?.tool &&
    toolCallChunk?.detail?.tool === toolResultChunk?.detail?.tool &&
    toolCallChunk?.detail?.run_id &&
    toolResultChunk?.detail?.run_id &&
    toolCallChunk?.detail?.run_id === toolResultChunk?.detail?.run_id
  ) {
    return true;
  }
  return false;
}

/**
 * Whether it's tool message or not[chunk]
 */
export const isToolMessage = (chunk: MessageToolChunk) => {
  return !!chunk.detail?.tool && chunk.detail?.tool !== 'agent_end_task';
};
