import { useEffect } from 'react';
import { cloneDeep, isEqual } from 'lodash-es';
import { useAgentStore } from '@/store';
import { MessageChunk, MessagePlanChunk, MessageToolChunk } from '@/types';
import { getPlan, ignoreToolChunks, isToolMessage, transformChunksToMessages } from './useChat/utils';

/**
 * 处理 chunks 数据的公共 hook
 * 用于更新左侧消息列表、整体 plan 和右侧工具列表
 */
export const useChunksProcessor = (chunks: MessageChunk[]) => {
  const { setPipelineMessages, setTaskPlan, setWorkspaceMessages } = useAgentStore();

  // 更新左侧消息列表和整体plan
  // useEffect(() => {
  //   const newMessages = transformChunksToMessages(cloneDeep(chunks));
  //   requestAnimationFrame(() => {
  //     setPipelineMessages(newMessages);
  //   });
  // }, [chunks, setPipelineMessages]);

  // 更新右下角plan
  useEffect(() => {
    const plan = getPlan(cloneDeep(chunks));
    if (plan && !isEqual(useAgentStore.getState().taskPlan, plan?.children)) {
      setTaskPlan(plan?.children || []);
    }
  }, [chunks, setTaskPlan]);

  // 右侧显示的列表处理
  useEffect(() => {
    const chunksCopy = cloneDeep(chunks);
    const detailList = chunksCopy
      .filter((chunk, index) => {
        const toolChunk = chunk as MessageToolChunk;
        // 有tool的，就认为是工具调用
        if (
          !isToolMessage(toolChunk) ||
          ignoreToolChunks.includes(toolChunk.detail?.tool) ||
          ignoreToolChunks.includes(toolChunk.type)
        ) {
          return false;
        }

        // 如果有一条tool_result的run_id和tool_call的run_id相同，则跳过tool_call
        // 浏览器的所有run_id都一样
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

        // 如果这次对话结束，则将isFinish设置为true，浏览器在结束后只显示图片，不显示sandbox
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
