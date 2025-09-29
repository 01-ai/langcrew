import { useEffect } from 'react';
import { cloneDeep, isEqual } from 'lodash-es';
import { useAgentStore } from '@/store';
import { MessageChunk, MessagePlanChunk, MessageToolChunk } from '@/types';
import { getPlan, ignoreToolChunks, isToolMessage, transformChunksToMessages } from './useChat/utils';

/**
 * handle chunks data common hook
 * used to update the left message list, overall plan and right tool list
 */
export const useChunksProcessor = (chunks: MessageChunk[]) => {
  const { setPipelineMessages, setTaskPlan, setWorkspaceMessages } = useAgentStore();

  // update the left message list and overall plan
  // useEffect(() => {
  //   const newMessages = transformChunksToMessages(cloneDeep(chunks));
  //   requestAnimationFrame(() => {
  //     setPipelineMessages(newMessages);
  //   });
  // }, [chunks, setPipelineMessages]);

  // update the bottom right plan
  useEffect(() => {
    const plan = getPlan(cloneDeep(chunks));
    if (plan && !isEqual(useAgentStore.getState().taskPlan, plan?.children)) {
      setTaskPlan(plan?.children || []);
    }
  }, [chunks, setTaskPlan]);

  // handle the list displayed on the right
  useEffect(() => {
    const chunksCopy = cloneDeep(chunks);
    const detailList = chunksCopy
      .filter((chunk, index) => {
        const toolChunk = chunk as MessageToolChunk;
        // if there is tool, it is considered as tool call
        if (
          !isToolMessage(toolChunk) ||
          ignoreToolChunks.includes(toolChunk.detail?.tool) ||
          ignoreToolChunks.includes(toolChunk.type)
        ) {
          return false;
        }

        // if there is a tool_result with the same run_id as the tool_call, skip the tool_call
        // all run_ids in the browser are the same
        if (toolChunk.type === 'tool_call') {
          const toolResultChunk = chunksCopy.find(
            (resultChunk, index2) =>
              resultChunk.type === 'tool_result' &&
              resultChunk.detail?.run_id === toolChunk.detail?.run_id &&
              index2 > index,
          );
          if (toolResultChunk) {
            return false;
          }
        }

        if (toolChunk.type === 'tool_result') {
          const toolCallChunk = chunksCopy.findLast(
            (chunk, index2) =>
              chunk.type === 'tool_call' && chunk.detail?.run_id === toolChunk.detail?.run_id && index2 < index,
          );
          if (toolCallChunk) {
            toolChunk.content = toolCallChunk.content;
            toolChunk.detail = {
              ...toolChunk.detail,
              param: toolCallChunk.detail.param,
              action: toolCallChunk.detail.action,
              action_content: toolCallChunk.detail.action_content,
            };
          }
        }

        const currentIndex = index;

        // if the conversation ends, set isFinish to true, the browser only displays images after the end, not sandbox
        const futureChunks = chunksCopy.slice(currentIndex + 1);
        const futureHasUserInput = futureChunks.some((chunk) => chunk.role === 'user');
        if (futureHasUserInput) {
          chunk.isFinish = true;
        }
        const futureHasFinish = futureChunks.some((chunk) => chunk.type === 'finish_reason');
        if (futureHasFinish) {
          chunk.isFinish = true;
        }

        return true;
      })
      .map((chunk) => ({
        ...chunk,
        type: (chunk as MessageToolChunk).detail.tool,
      }));

    if (!isEqual(useAgentStore.getState().workspaceMessages, detailList)) {
      setWorkspaceMessages(detailList);
    }
  }, [chunks, setWorkspaceMessages]);
};
