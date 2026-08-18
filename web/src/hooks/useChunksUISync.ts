import { useEffect } from 'react';
import { cloneDeep, isEqual } from 'lodash-es';
import { useAgentStoreApi } from '@/store';
import { MessageChunk, MessagePlanChunk, MessageToolChunk } from '@/types';
import { getPlan, ignoreToolChunks, isPlanChunk, isToolMessage } from './useChat/utils';
import { tryInterceptAutoPreview } from '@/hooks/useFilePreview';

/**
 * Chunks UI sync hook
 * Sync chunks into UI: messages, plan, and tools
 */
export const useChunksUISync = (chunks: MessageChunk[]) => {
  const storeApi = useAgentStoreApi();

  useEffect(() => {
    const {
      setFileViewerFile,
      setLastWorkspaceAction,
      pipelineMessages,
      fileViewerFile,
      lastWorkspaceAction,
      chunks,
      setWorkspaceVisible,
      autoOpenRightPanel,
      disableWorkspaceRendering,
    } = storeApi.getState();
    if (!autoOpenRightPanel) {
      return;
    }

    if (disableWorkspaceRendering) {
      return;
    }

    // Skip if there are no messages
    if (!pipelineMessages || pipelineMessages.length === 0) {
      return;
    }
    // Get the last message
    const lastMessage = pipelineMessages[pipelineMessages.length - 1];

    // Get the last chunk with attachments
    const lastChunkWithAttachments = (function () {
      // First look for a chunk with attachments
      const chunk = lastMessage?.messages?.findLast((chunk) => chunk.detail?.attachments?.length > 0);
      if (chunk) {
        return chunk;
      }
      // Then look for an attachment chunk in the plan
      const plan = lastMessage?.messages?.findLast((chunk) => chunk.type === 'plan');
      if (plan) {
        const step = (plan as MessagePlanChunk).children.findLast((step) =>
          step.children?.some((child) => child.detail?.attachments?.length > 0),
        );
        if (!step) {
          return null;
        }
        return step.children?.findLast((chunk) => chunk.detail?.attachments?.length > 0);
      }
      return null;
    })();

    if (!lastChunkWithAttachments) {
      // Close file preview if it was auto-opened
      // Show workspace if any tool was called
      if (
        fileViewerFile &&
        lastWorkspaceAction === 'auto' &&
        chunks &&
        chunks?.length > 0 &&
        chunks?.some(
          (chunk) =>
            isToolMessage(chunk as MessageToolChunk) ||
            (isPlanChunk(chunk) &&
              (chunk as MessagePlanChunk).children?.some((step) =>
                step.children?.some((planChunk) => isToolMessage(planChunk as MessageToolChunk)),
              )),
        )
      ) {
        setFileViewerFile(undefined);
        setWorkspaceVisible(true);
      }

      return;
    }

    const attachments = lastChunkWithAttachments?.detail?.attachments || [];

    const openAutoPreview = (file: (typeof attachments)[number], siblings: typeof attachments) => {
      const state = storeApi.getState();
      if (
        tryInterceptAutoPreview(
          {
            layoutConfig: state.layoutConfig,
            fullscreenFilePreview: state.fullscreenFilePreview,
            filePreviewConfig: state.filePreviewConfig,
            setFileViewerFile: state.setFileViewerFile,
            setLastWorkspaceAction: state.setLastWorkspaceAction,
          },
          file,
          siblings,
        )
      ) {
        return;
      }
      setLastWorkspaceAction('auto');
      setFileViewerFile(file, siblings);
    };

    // If attachments include both pptx and pdf, preview the pdf
    if (
      attachments.length >= 2 &&
      attachments.some((item) => item.filename?.endsWith('.pptx')) &&
      attachments.some((item) => item.filename?.endsWith('.pdf'))
    ) {
      const pdf = attachments.find((item) => item.filename?.endsWith('.pdf'));
      if (pdf) {
        openAutoPreview(pdf, attachments);
      }
      return;
    }

    // Preview the first attachment by default
    const defaultFile = attachments[0];
    openAutoPreview(defaultFile, attachments);
  }, [chunks, storeApi]);

  // Update the bottom-right plan
  useEffect(() => {
    const { setTaskPlan } = storeApi.getState();
    const plan = getPlan(cloneDeep(chunks));
    if (plan && !isEqual(storeApi.getState().taskPlan, plan?.children)) {
      setTaskPlan(plan?.children || []);
    }
  }, [chunks, storeApi]);

  // Right-pane list handling
  useEffect(() => {
    const { setWorkspaceMessages, setWorkspaceVisible, setCloudPhoneAuthInfo, cloudPhoneAuthInfo } =
      storeApi.getState();
    const chunksCopy = cloneDeep(chunks);

    // Persist cloud-phone AuthInfo
    const lastToolCall = [...chunksCopy].reverse().find((c) => (c as MessageToolChunk).type === 'tool_call') as
      | MessageToolChunk
      | undefined;
    if (lastToolCall && !lastToolCall.detail?.tool?.startsWith('phone_rpa_')) {
      if (cloudPhoneAuthInfo) {
        setCloudPhoneAuthInfo(undefined);
      }
    }

    const detailList = chunksCopy
      .filter((chunk, index) => {
        const toolChunk = chunk as MessageToolChunk;
        // Treat as a tool call when a tool is present
        if (
          !isToolMessage(toolChunk) ||
          ignoreToolChunks.includes(toolChunk.detail?.tool) ||
          ignoreToolChunks.includes(toolChunk.type)
        ) {
          return false;
        }

        // Parse cloud-phone auth_info (only in phone_rpa_tool_create_sandbox)
        if (toolChunk.type === 'tool_result' && toolChunk.detail?.tool === 'phone_rpa_tool_create_sandbox') {
          const authInfo = toolChunk.detail?.result?.auth_info || toolChunk.detail?.result?.artifact?.auth_info;
          if (authInfo && !isEqual(authInfo, cloudPhoneAuthInfo)) {
            setCloudPhoneAuthInfo(authInfo);
          }
        }

        // Skip tool_call when a tool_result shares the same run_id
        // Browser tools share the same run_id
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

        // On turn end set isFinish so the browser shows images only, not sandbox
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

    if (!isEqual(storeApi.getState().workspaceMessages, detailList)) {
      setWorkspaceMessages(detailList);
    }
  }, [chunks, storeApi]);
};
