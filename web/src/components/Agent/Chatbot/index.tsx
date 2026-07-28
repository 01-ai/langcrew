import React, { Fragment, isValidElement, useCallback, useEffect, useRef } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { useAgentStore, useAgentStoreApi } from '@/store';
import Sender from '@/components/Agent/Chatbot/Sender';
import MessageAttachments from '@/components/Agent/Chatbot/MessageAttachments';
import MessageMetadataRenderer from '@/components/Agent/Chatbot/MessageMetadataRenderer';
import { resolveMessageMetadata } from '@/utils/messageMetadata';
import { AgentMode, type HeaderNode, type MessageToolChunk } from '@/types';
import { isToolMessage } from '@/hooks/useChat/utils';
import classNames from 'classnames';
import ScrollToBottom from 'react-scroll-to-bottom';
import { Markdown } from '@/components/Infra';
import MessageBrief from '@/registry/common/MessageBrief';
import Loading from '@/components/Infra/Loading';
import ToolRender from './ToolRender';
import TaskProgress from '../Workspace/TaskProgress';
import StartScreen, { StartScreenProps } from './StartScreen';
import PreviewScreen, { PreviewScreenProps } from './PreviewScreen';
import AgentHeader from '../AgentHeader';
import WebsiteDeliveryEndWindow from '@/registry/website_delivery/WebsiteDeliveryEndWindow';
import { useTranslation } from '@/hooks/useTranslation';
import { findCompletedWebsiteDelivery } from '@/registry/website_delivery';
import { isDevOrTest } from '@/utils';
import eventBus from '@/utils/eventBus';
import { formatJsonUserMessageWithNearestForm } from '@/utils/formSubmissionDisplay';
import { WelcomeScreenContext } from '@/types/agentx';

export const getTraceUrl = (traceId?: string | null) => {
  if (!traceId) {
    return undefined;
  }

  const isBoe = isDevOrTest();
  const projectId = isBoe ? 'cmpb1czn80005zi07nicibopt' : 'cmpp7aas7000618077kps0pgo';
  const baseUrl = isBoe ? 'https://langfuse.lingyiwanwu.net' : 'https://trace.wanzhi.com';

  const targetPath = `/project/${projectId}/traces/${encodeURIComponent(traceId)}`;
  return `${baseUrl}${targetPath}`;
};

const Chatbot = ({
  basePath,
  agentId,
  sessionId,
  shareButtonNode,
  backButtonNode,
  welcomeScreen,
  startScreen,
  previewScreen,
  menuItems,
  showSenderActions = false,
  headerNode,
  className,
}: {
  basePath?: string;
  agentId?: string;
  sessionId?: string;
  shareButtonNode?: React.ReactNode;
  backButtonNode?: React.ReactNode;
  welcomeScreen?: React.ReactNode | ((context: WelcomeScreenContext) => React.ReactNode);
  startScreen?: StartScreenProps;
  previewScreen?: PreviewScreenProps;
  menuItems?: {
    key: string;
    label: string;
    icon?: React.ReactNode;
  }[];
  showSenderActions?: boolean;
  headerNode?: HeaderNode;
  className?: string;
}) => {
  const {
    mode,
    pipelineMessages,
    workspaceVisible,
    setWorkspaceVisible,
    workspaceMessages,
    taskPlan,
    fileViewerMaximized,
    previewConfig,
    rightPanelExternalControl,
    setLastWorkspaceAction,
    fileViewerFile,
    autoOpenRightPanel,
    disableWorkspaceRendering,
    layoutConfig,
    instanceId,
    senderConfig,
    renderMessageMetadata,
  } = useAgentStore();
  const { t } = useTranslation();

  // useAgentStore always wraps the return value in { ...state, getState, setState },
  // so selectors that return primitive falsy values will evaluate to truthy (!!{}).
  // Read senderConfig as an object from the no-selector call above instead.
  const disabled = !!(senderConfig?.inputDisabled || senderConfig?.sendDisabled);
  const storeApi = useAgentStoreApi();

  const send = useCallback(
    (prompt: string) => {
      if (disabled) return;
      const { senderMetadata, setSenderMetadata } = storeApi.getState();
      eventBus.emit(`call_send_${instanceId}`, {
        content: prompt,
        ...(senderMetadata !== undefined && { metadata: senderMetadata }),
      });
      setSenderMetadata(undefined);
    },
    [disabled, instanceId, storeApi],
  );

  const appendText = useCallback(
    (text: string) => {
      const { senderContent, setSenderContent } = storeApi.getState();
      setSenderContent(senderContent + text);
    },
    [storeApi],
  );

  // Auto Open workspace Functions
  const autoOpenRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (!autoOpenRightPanel || disableWorkspaceRendering) {
      return;
    }
    // New detected workspace message（Number from 0 And become 1+）
    const hasNewMessages = workspaceMessages?.length > 0 && prevMessagesLengthRef.current === 0;

    // Update Reference
    prevMessagesLengthRef.current = workspaceMessages?.length || 0;

    // If there's no new information, don't process it.
    if (!hasNewMessages) {
      return;
    }

    // If external control is clearly closed, it is not automatically opened (respect for external intent)
    if (rightPanelExternalControl && previewConfig?.rightPanelVisible === false) {
      console.log('[Chatbot Auto Open] Externally controlled and explicitly closed, not automatically open');
      return;
    }

    // If fileViewer Opened, not automatically workspace（(c) Avoiding conflict)
    if (fileViewerFile) {
      console.log('[Chatbot Auto Open] fileViewer Opened, not automatically workspace');
      return;
    }

    // If workspace Opened, not processed
    if (workspaceVisible) {
      console.log('[Chatbot Auto Open] workspace Opened, no automatic opening required');
      return;
    }

    console.log('[Chatbot Auto Open] Auto Open workspace', {
      workspaceMessages: workspaceMessages?.length,
      workspaceVisible,
      fileViewerFile: !!fileViewerFile,
    });

    // Record trigger source and update status
    setLastWorkspaceAction('auto');
    setWorkspaceVisible(true);
  }, [
    setWorkspaceVisible,
    setLastWorkspaceAction,
    workspaceMessages?.length,
    workspaceVisible,
    previewConfig?.rightPanelVisible,
    rightPanelExternalControl,
    fileViewerFile,
    autoOpenRightPanel,
    disableWorkspaceRendering,
  ]);

  const renderMessages = () => {
    return pipelineMessages.map((message, messageIndex) => {
      if (message.role === 'user') {
        return message.messages.map((msg, msgIndex) => {
          const displayContent = formatJsonUserMessageWithNearestForm(
            msg.content,
            pipelineMessages,
            msg,
            messageIndex,
            t,
          );
          const displayMessage = displayContent === msg.content ? msg : { ...msg, content: displayContent };

          return (
            <div key={msgIndex} className="flex items-center gap-2 justify-end w-full">
              {msg.loading ? <Loading /> : null}
              <div className="flex flex-col items-end max-w-full">
                <MessageMetadataRenderer
                  metadata={resolveMessageMetadata(msg)}
                  renderMessageMetadata={renderMessageMetadata}
                />
                <MessageAttachments message={msg} isUserMessage />
                {msg.content && (
                  <Bubble
                    typing
                    placement="end"
                    styles={{
                      content: {
                        backgroundColor: '#f4f4f4',
                        borderRadius: '24px',
                        border: 'none',
                        color: '#000000',
                        fontSize: '16px',
                        lineHeight: '28px',
                      },
                    }}
                    content={<MessageBrief message={displayMessage} />}
                  />
                )}
              </div>
            </div>
          );
        });
      } else if (message.role === 'assistant') {
        const hasUserInput = message.messages.some((msg) => msg.type === 'user_input');

        const turnWebsiteDelivery = findCompletedWebsiteDelivery(message.messages);

        // Will finish_reason Stand up, and... trace link Peer presentation (compatible draft)
        let finishReasonMsg: any | undefined;
        for (let i = message.messages.length - 1; i >= 0; i--) {
          if (message.messages[i]?.type === 'finish_reason') {
            finishReasonMsg = message.messages[i];
            break;
          }
        }
        // Do Not Show client_tool_call
        const messagesWithoutFinishReason = message.messages.filter(
          (msg) => msg.type !== 'finish_reason' && msg.type !== 'client_tool_call',
        );

        const showFinishReason = Boolean(
          finishReasonMsg && !hasUserInput && (finishReasonMsg?.detail?.status || 'completed') !== 'user_input',
        );

        const traceUrl = getTraceUrl(message.trace_id);
        return (
          <Bubble
            typing
            key={messageIndex}
            placement="start"
            classNames={
              layoutConfig.narrowMode
                ? {
                    root: 'w-full',
                    body: 'w-full max-w-full min-w-0',
                    content: 'w-full max-w-full min-w-0',
                  }
                : {}
            }
            styles={{
              content: {
                backgroundColor: 'transparent',
                padding: 0,
                border: 'none',
                boxShadow: 'none',
                fontSize: '16px',
                lineHeight: '28px',
                fontFamily: '"PingFang SC", "SF Pro", sans-serif',
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
                      <MessageBrief message={msg} hasUserInput={hasUserInput} />
                      <MessageAttachments message={msg} />
                    </Fragment>
                  );
                })}
                {!layoutConfig.narrowMode && turnWebsiteDelivery && (
                  <WebsiteDeliveryEndWindow message={turnWebsiteDelivery} />
                )}
                {(showFinishReason || traceUrl) && (
                  <div className="w-fit flex items-center gap-3">
                    {showFinishReason && <MessageBrief message={finishReasonMsg} hasUserInput={hasUserInput} />}
                    {traceUrl && (
                      <a
                        href={traceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[14px] leading-[22px] text-[#999] hover:text-[#666]"
                      >
                        {t('chatbot.view_trace')} <span className="text-[#bbb]">{'>'}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            }
          />
        );
      }
    });
  };

  // Remove the original scroll logic, use ScrollToBottom Component

  return (
    <div
      className={classNames(
        'h-full bg-transparent overflow-hidden bg-bottom bg-no-repeat flex flex-col',
        {
          'bg-[length:120%_244px]': mode === AgentMode.Chatbot,
          '2xl:bg-[length:1616px_244px]': mode === AgentMode.Chatbot,
          'xl:bg-[length:1012px_244px]': mode === AgentMode.Chatbot,
          'bg-[length:120%_108px]': mode === AgentMode.Replay,
          '2xl:bg-[length:1616px_108px]': mode === AgentMode.Replay,
          'xl:bg-[length:1012px_108px]': mode === AgentMode.Replay,
          'flex-auto': !fileViewerMaximized,
          'flex-0': fileViewerMaximized,
        },
        className,
      )}
    >
      {layoutConfig.headerPosition === 'inner' && (
        <AgentHeader headerNode={headerNode} backButtonNode={backButtonNode} shareButtonNode={shareButtonNode} />
      )}
      <div className="flex flex-col flex-1 min-h-0 !pb-4 w-full">
        {pipelineMessages.length > 0 ? (
          <ScrollToBottom
            className="w-full max-w-full flex flex-col flex-1 min-h-0"
            scrollViewClassName="chat-scrollbar flex flex-col gap-[24px] px-0 py-4 pb-[50px]"
            initialScrollBehavior="smooth"
            followButtonClassName="follow-btn-none"
          >
            {renderMessages()}
          </ScrollToBottom>
        ) : sessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <Loading />
          </div>
        ) : welcomeScreen ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto chat-scrollbar">
            {typeof welcomeScreen === 'function' ? welcomeScreen({ send, appendText, disabled }) : welcomeScreen}
          </div>
        ) : previewScreen ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto chat-scrollbar">
            <PreviewScreen {...(previewScreen as PreviewScreenProps)} onPromptClick={send} disabled={disabled} />
          </div>
        ) : startScreen ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto chat-scrollbar">
            <StartScreen {...startScreen} onPromptClick={send} disabled={disabled} />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="w-full max-w-full">
          <Sender
            basePath={basePath}
            agentId={agentId}
            sessionId={sessionId}
            menuItems={menuItems}
            showSenderActions={showSenderActions}
            topAddon={
              !layoutConfig.narrowMode && !workspaceVisible && taskPlan?.length ? (
                <TaskProgress variant="inputTop" compactBehavior="openWorkspace" />
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
