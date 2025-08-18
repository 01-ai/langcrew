import React, { Fragment, useEffect, useRef } from 'react';
import { Button, Flex, Layout, Card, Typography, ConfigProvider, theme, message as antdMessage } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CopyOutlined } from '@ant-design/icons';
import { Bubble, Actions, Prompts } from '@ant-design/x';
import { useAgentStore } from '@/store';
import Sender from '@/components/Agent/Chatbot/Sender';
import MessageAttachments from '@/components/Agent/Chatbot/MessageAttachments';
import ClickableTool from '@/components/Agent/Chatbot/ClickableTool';
import { AgentMode, MessageToolChunk, TaskStage } from '@/types';
import ZoomIn from '@/assets/png/zoom-in.png';
import Back from '@/assets/png/back.png';
import { isToolMessage } from '@/hooks/useChat/utils';
import footerBgUrl from '@/assets/png/footer-bg.png';
import classNames from 'classnames';
import { useTranslation } from '@/hooks/useTranslation';
import ScrollToBottom from 'react-scroll-to-bottom';
import { Markdown } from '@/components/Infra';
import MessageBrief from '@/registry/common/MessageBrief';
import Loading from '@/components/Infra/Loading';

const Chatbot = ({ shareButtonNode }: { shareButtonNode?: React.ReactNode }) => {
  const { Header } = Layout;
  const { Title, Text } = Typography;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    mode,
    sessionInfo,
    basePath,
    backPath,
    pipelineMessages,
    taskStage,
    workspaceVisible,
    setWorkspaceVisible,
    setPipelineTargetMessage,
    workspaceMessages,
  } = useAgentStore();

  const handleWorkspaceOpen = () => {
    setWorkspaceVisible(true);
  };

  // 自动打开 workspace 功能
  const autoOpenRef = useRef(false);
  useEffect(() => {
    // 只自动打开一次
    if (workspaceMessages?.length > 0 && !workspaceVisible && !autoOpenRef.current) {
      setWorkspaceVisible(true);
      autoOpenRef.current = true;
    }
  }, [setWorkspaceVisible, workspaceMessages?.length, workspaceVisible]);

  // 移除原有的滚动逻辑，使用 ScrollToBottom 组件

  return (
    <div
      className={classNames('h-full flex-auto bg-white overflow-hidden bg-bottom bg-no-repeat', {
        'bg-[length:120%_244px]': mode === AgentMode.Chatbot,
        '2xl:bg-[length:1616px_244px]': mode === AgentMode.Chatbot,
        'xl:bg-[length:1012px_244px]': mode === AgentMode.Chatbot,
        'bg-[length:120%_108px]': mode === AgentMode.Replay,
        '2xl:bg-[length:1616px_108px]': mode === AgentMode.Replay,
        'xl:bg-[length:1012px_108px]': mode === AgentMode.Replay,
      })}
      style={{ backgroundImage: `url(${footerBgUrl})` }}
    >
      <Flex vertical className="h-full !px-4 !pb-[20px]">
        <Header className="h-[64px] !bg-white !p-0">
          <Flex justify="space-between" className="h-full">
            <Flex className="w-1/3" justify="start" align="center">
              <Button
                type="text"
                icon={<img src={Back} />}
                onClick={() => {
                  // 避免sessionId 重置失败
                  navigate(`${backPath || basePath}`);
                }}
              />
            </Flex>
            <Flex className="w-1/3" justify="center" align="center">
              <Title level={4} className="truncate !mb-0">
                {sessionInfo?.title || ''}
              </Title>
            </Flex>
            <Flex className="w-1/3 [&_.ant-btn-icon-only]:!w-[40px]" justify="end" align="center">
              {shareButtonNode ? shareButtonNode : null}
              {!workspaceVisible && (
                <Button type="text" icon={<img src={ZoomIn} />} onClick={handleWorkspaceOpen} className="ml-[12px]" />
              )}
            </Flex>
          </Flex>
        </Header>
        <ScrollToBottom
          className="mx-auto w-full max-w-full 2xl:max-w-[1216px] xl:max-w-[904px] flex flex-col gap-[16px] p-4 flex-auto overflow-auto"
          scrollViewClassName="chat-scrollbar"
          initialScrollBehavior="smooth"
          followButtonClassName="follow-btn-none"
        >
          {pipelineMessages.map((message, idx) => {
            if (message.role === 'user') {
              return message.messages.map((msg, idx) => {
                const actionItems = msg.loading
                  ? []
                  : [
                      {
                        key: 'copy',
                        icon: <CopyOutlined />,
                        label: 'Copy',
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
                              // 降级方案：使用传统的复制方法
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
                          backgroundColor: '#E1F1FF',
                        },
                      }}
                      content={
                        <Fragment key={idx}>
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
              return (
                <Bubble
                  typing
                  key={idx}
                  placement="start"
                  className="my-3"
                  styles={{ content: { backgroundColor: '#ffffff', padding: 0 } }}
                  content={
                    <Flex vertical gap="middle">
                      {message.messages.map((msg, idx) => {
                        if (isToolMessage(msg as MessageToolChunk)) {
                          return (
                            <Fragment key={idx}>
                              {msg.content && <Markdown content={msg.content} className="text-sm text-gray-500" />}
                              <ClickableTool
                                key={idx}
                                onClick={() => setPipelineTargetMessage(msg)}
                                active={(msg as MessageToolChunk).detail?.status === 'pending'}
                              >
                                <MessageBrief message={msg} hasUserInput={hasUserInput} />
                                <MessageAttachments message={msg} />
                              </ClickableTool>
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
                    </Flex>
                  }
                />
              );
            }
          })}
        </ScrollToBottom>
        <div className="mx-auto w-full max-w-full 2xl:max-w-[1216px] xl:max-w-[904px]">
          <Sender />
        </div>
      </Flex>
    </div>
  );
};

export default Chatbot;
