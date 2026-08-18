import React, { Fragment } from 'react';
import { message as antdMessage } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { Bubble, Actions } from '@ant-design/x';
import { useTranslation } from '@/hooks/useTranslation';
import { isMessageFinish, isToolMessage } from '@/hooks/useChat/utils';
import MessageAttachments from '@/components/Agent/Chatbot/MessageAttachments';
import MessageMetadataRenderer from '@/components/Agent/Chatbot/MessageMetadataRenderer';
import { Markdown } from '@/components/Infra';
import Loading from '@/components/Infra/Loading';
import MessageBrief from '@/registry/common/MessageBrief';
import ToolRender from '@/components/Agent/Chatbot/ToolRender';
import { FinishReasonChunk, MessageToolChunk } from '@/types';
import type { MessagesRenderProps } from './index.d';
import { resolveMessageMetadata } from '@/utils/messageMetadata';
import { useAgentStore } from '@/store';
import { ResponseActionBar } from '@/features/feedback';
import { getReferencedCitationSources } from '@/features/citation/utils/citation';

const MessagesRenderComponent: React.FC<MessagesRenderProps> = ({ messages, renderMessageMetadata: propRenderMessageMetadata }) => {
  const { t } = useTranslation();
  const { renderMessageMetadata: storeRenderMessageMetadata, layoutConfig } = useAgentStore();
  const renderMessageMetadata = propRenderMessageMetadata || storeRenderMessageMetadata;

  if (!messages?.length) return null;

  // const pipelineMessages = transformChunksToMessages(sessionChunks);

  return messages.map((message, idx) => {
    if (message.role === 'user') {
      return message.messages.map((msg, idx) => {
        const actionItems = msg.loading
          ? []
          : [
              {
                key: 'copy',
                icon: <CopyOutlined />,
                label: t('code.copy'),
              },
            ];
        return (
          <div key={idx} className="flex items-center gap-2 justify-end">
            <Actions
              items={actionItems}
              onClick={(info) => {
                if (info.key === 'copy') {
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(msg.content);
                    } else {
                      // Fallback copy path for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = msg.content;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                    }
                    antdMessage.success(t('code.copy.success'));
                  } catch (error) {
                    console.error('Copy failed:', error);
                  }
                }
              }}
            />
            {msg.loading ? <Loading /> : null}
            <Bubble
              typing
              placement="end"
              styles={{
                content: {
                  backgroundColor: '#f4f4f4',
                  borderRadius: '24px',
                  border: 'none',
                  color: '#000000',
                },
              }}
              content={
                <Fragment key={idx}>
                  <MessageMetadataRenderer
                    metadata={resolveMessageMetadata(msg)}
                    renderMessageMetadata={renderMessageMetadata}
                  />
                  <MessageBrief message={msg} />
                  <MessageAttachments message={msg} />
                </Fragment>
              }
            />
          </div>
        );
      });
    } else if (message.role === 'assistant') {
      const hasUserInput = message.messages.some((msg) => msg.type === 'user_input');
      const citationSources = getReferencedCitationSources(message);
      const showCitationSummary = layoutConfig.showWorkspace && isMessageFinish(message) && citationSources.length > 0;
      let finishReasonMsg: FinishReasonChunk | undefined;
      for (let messageIndex = message.messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
        if (message.messages[messageIndex]?.type === 'finish_reason') {
          finishReasonMsg = message.messages[messageIndex] as FinishReasonChunk;
          break;
        }
      }
      const showFinishReason = Boolean(
        finishReasonMsg && !hasUserInput && (finishReasonMsg.detail?.status || 'completed') !== 'user_input',
      );
      const messagesWithoutFinishReason = message.messages.filter((msg) => msg.type !== 'finish_reason');

      return (
        <Bubble
          typing
          key={idx}
          placement="start"
          className="my-5"
          styles={{
            content: {
              backgroundColor: '#ffffff',
              padding: 0,
            },
          }}
          content={
            <div className="flex flex-col gap-4">
              {messagesWithoutFinishReason.map((msg, idx) => {
                if (isToolMessage(msg as MessageToolChunk)) {
                  return (
                    <Fragment key={idx}>
                      <Markdown content={msg.content} />
                      <ToolRender message={msg as MessageToolChunk} hasUserInput={hasUserInput} />
                      <MessageAttachments message={msg} />
                    </Fragment>
                  );
                }
                return (
                  <Fragment key={idx}>
                    <MessageBrief message={msg} hasUserInput={hasUserInput} citations={citationSources} />
                    <MessageAttachments message={msg} />
                  </Fragment>
                );
              })}
              <ResponseActionBar
                message={message}
                hasUserInput={hasUserInput}
                finishReasonMsg={finishReasonMsg}
                showFinishReason={showFinishReason}
                citationSources={citationSources}
                showCitationSummary={showCitationSummary}
              />
            </div>
          }
        />
      );
    }
  });
};

export { MessagesRenderComponent as MessagesRender };
export default MessagesRenderComponent;
