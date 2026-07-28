import { useEffect } from 'react';
import { cloneDeep, isEqual } from 'lodash-es';
import { useAgentStoreApi } from '@/store';
import { MessageChunk, MessagePlanChunk, MessageToolChunk } from '@/types';
import { getPlan, ignoreToolChunks, isPlanChunk, isToolMessage } from './useChat/utils';
import { tryInterceptAutoPreview } from '@/hooks/useFilePreview';

/**
 * Synchronizes chunks with UI state, including messages, task plans, and tools.
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

    // Do nothing when there are no messages.
    if (!pipelineMessages || pipelineMessages.length === 0) {
      return;
    }
    // Read the last message.
    const lastMessage = pipelineMessages[pipelineMessages.length - 1];

    // Find the last chunk containing an attachment.
    const lastChunkWithAttachments = (function () {
      // Check top-level message chunks first.
      const chunk = lastMessage?.messages?.findLast((chunk) => chunk.detail?.attachments?.length > 0);
      if (chunk) {
        return chunk;
      }
      // Then check plan steps for attachment chunks.
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
      // Close a file preview that was opened automatically for the previous message.
      // Show the workspace when a tool call is available.
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

    // When both PPTX and PDF attachments exist, preview the PDF.
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

    // Otherwise, preview the first attachment.
    const defaultFile = attachments[0];
    openAutoPreview(defaultFile, attachments);
  }, [chunks, storeApi]);

  // Update the task plan in the lower-right panel.
  useEffect(() => {
    const { setTaskPlan } = storeApi.getState();
    const plan = getPlan(cloneDeep(chunks));
    if (plan && !isEqual(storeApi.getState().taskPlan, plan?.children)) {
      setTaskPlan(plan?.children || []);
    }
  }, [chunks, storeApi]);

  // Build the workspace message list.
  useEffect(() => {
    const { setWorkspaceMessages, setWorkspaceVisible, setCloudPhoneAuthInfo, cloudPhoneAuthInfo } =
      storeApi.getState();
    const chunksCopy = cloneDeep(chunks);

    // Persist cloud phone auth information.
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
        // Use tool as the display name.
        if (
          !isToolMessage(toolChunk) ||
          ignoreToolChunks.includes(toolChunk.detail?.tool) ||
          ignoreToolChunks.includes(toolChunk.type)
        ) {
          return false;
        }

        // Read cloud phone auth_info only from phone_rpa_tool_create_sandbox.
        if (toolChunk.type === 'tool_result' && toolChunk.detail?.tool === 'phone_rpa_tool_create_sandbox') {
          const authInfo = toolChunk.detail?.result?.auth_info || toolChunk.detail?.result?.artifact?.auth_info;
          if (authInfo && !isEqual(authInfo, cloudPhoneAuthInfo)) {
            setCloudPhoneAuthInfo(authInfo);
          }
        }

        // Skip a tool_call when a tool_result with the same run_id exists.
        // Browser tool chunks all share the same run_id.
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

        // After completion, browser tools show the final screenshot instead of the sandbox.
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
