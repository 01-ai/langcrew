import React, { useEffect, useMemo, useState } from 'react';
import { Button, Flex, List, Skeleton, Spin, Typography } from 'antd';
import { CloseOutlined, DesktopOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store';
import registry from '@/registry';
import Controller from './Controller';
import TaskProgress from './TaskProgress';
import ZoomOut from '@/assets/png/zoom-out.png';
import notActiveUrl from '@/assets/svg/workspace-not-active.svg';
import { useTranslation } from '@/hooks/useTranslation';
import { MessageToolChunk } from '@/types';
import { ToolIconEmpty } from '@/registry/common/icons';
import MessageBrief from '@/registry/common/MessageBrief';
import useTakeOverPhone from './useTakeOverPhone';
import { CloudPhone } from '@/components/Infra';

const Workspace = () => {
  const { t } = useTranslation();
  const { Title } = Typography;
  const { workspaceVisible, setWorkspaceVisible, workspaceMessages, pipelineTargetMessage } = useAgentStore();
  const [renderMessage, setRenderMessage] = useState<MessageToolChunk>();

  const [isRealTime, setIsRealTime] = useState(false);

  const { needTakeOverPhone, innerMessage } = useTakeOverPhone(isRealTime);

  const workspaceRenderer = (message) => {
    if (needTakeOverPhone) {
      return (
        <div className="w-full h-full flex justify-center items-center">
          <CloudPhone
            needHumanIntervention
            accessKey={innerMessage?.detail?.access_key}
            accessSecretKey={innerMessage?.detail?.access_secret_key}
            instanceNo={innerMessage?.detail?.instance_no}
            userId={innerMessage?.detail?.user_id}
          />
        </div>
      );
    }
    if (!message) {
      return (
        <div className="w-full h-full flex justify-center items-center">
          <img src={notActiveUrl} alt="not-active" />
        </div>
      );
    }
    const Detail = registry.getDetailRenderer(message?.type);
    if (message?.type.startsWith('browser')) {
      // 浏览器相关的，pending也渲染sandbox，所以自己处理
      return <Detail key="detail" message={message} isRealTime={isRealTime} />;
    }
    if (message?.detail?.status === 'running' || message?.detail?.status === 'pending') {
      if (message?.type === 'web_search') {
        return (
          <div className="w-full h-full items-center p-4 overflow-auto">
            <List
              className="w-full"
              itemLayout="vertical"
              size="large"
              dataSource={Array.from({ length: 10 }, (_, index) => index)}
              renderItem={() => <Skeleton active className="mb-6" />}
              split
              rowKey={(item) => `${item}`}
            />
          </div>
        );
      }
      return (
        <div className="w-full h-full flex justify-center items-center">
          <Spin spinning />
        </div>
      );
    }

    return <Detail key="detail" message={message} isRealTime={isRealTime} />;
  };

  const handleWorkspaceClose = () => {
    setWorkspaceVisible(false);
  };

  const getMessageTypeIcon = (type: string) => {
    if (!type) {
      return <ToolIconEmpty />;
    }
    const Icon = registry.getToolIcon(type);
    return <Icon />;
  };

  useEffect(() => {
    const targetMessage =
      pipelineTargetMessage && pipelineTargetMessage.id
        ? workspaceMessages.find((message) => message.id === pipelineTargetMessage.id)
        : workspaceMessages.at(-1);
    setRenderMessage(targetMessage);
    // 只有用户点击了tool，才打开workspace
    if (pipelineTargetMessage?.type && !!registry.getMessageType(pipelineTargetMessage?.type)?.detailRenderer) {
      setWorkspaceVisible(true);
    }
  }, [workspaceMessages, pipelineTargetMessage, renderMessage, setWorkspaceVisible]);

  const renderTitle = () => {
    if (!renderMessage) {
      return null;
    }
    return (
      <div className="rounded-3xl border flex items-center gap-2 px-3 py-2 border-[#e9e9e9] bg-[#f0f0f0] w-fit  max-w-full">
        <MessageBrief message={renderMessage} withIcon={false} />
      </div>
    );
  };

  return (
    workspaceVisible && (
      <Flex vertical className="min-w-[45%] max-w-[45%] h-full !py-5 !pl-0 !pr-5 !bg-white">
        <Flex vertical className="w-full h-full !px-6 !pt-3 !pb-6 !bg-[#F9F9F9] rounded-3xl">
          <Flex justify="space-between" className="h-[52px] [&_.ant-btn-icon-only]:!w-[40px]" align="center">
            <Title level={4} className="!mb-0">
              {t('workspace')}
            </Title>
            <Button type="text" icon={<img src={ZoomOut} />} onClick={handleWorkspaceClose} style={{ fontSize: 20 }} />
          </Flex>
          <Flex vertical className="h-full overflow-hidden" gap={20}>
            <Flex align="center" gap="middle">
              <Flex
                className="border-[#E1E1E1] border-1 border-solid w-[52px] h-[52px] rounded-md bg-[linear-gradient(180deg,_#FCFCFC_0%,_#EDEDED_100%)] text-[28px]"
                align="center"
                justify="center"
              >
                {getMessageTypeIcon(renderMessage?.type)}
              </Flex>
              <div className="text-sm flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap">{renderTitle()}</div>
            </Flex>
            <div className="flex-1 flex flex-col h-full border border-[#EDEDED] rounded-xl overflow-hidden bg-white shadow-[0px_2px_12px_0px_rgba(0,_0,_0,_0.04)]">
              <div className="h-[44px] flex justify-center items-center py-3 px-0 border-b-1 border-[#EDEDED] text-[16px] overflow-hidden overflow-ellipsis whitespace-nowrap max-w-full">
                {renderMessage?.detail?.action ||
                  renderMessage?.type
                    ?.split?.('_')
                    ?.map((word) => word?.charAt(0)?.toUpperCase() + word?.slice(1))
                    ?.join(' ') ||
                  'Tool'}
              </div>
              <div className="flex-1 overflow-hidden">{workspaceRenderer(renderMessage)}</div>
              <Flex className="border-t-1 border-[#EDEDED] shadow-[0px_-2px_8px_0px_rgba(0,0,0,0.04)]">
                <Controller onRealTimeChange={setIsRealTime} />
              </Flex>
            </div>
            <TaskProgress />
          </Flex>
        </Flex>
      </Flex>
    )
  );
};

export default Workspace;
