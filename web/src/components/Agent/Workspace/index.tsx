import React, { useEffect, useRef, useState } from 'react';
import { Button, List, Skeleton, Spin } from 'antd';
import { useAgentStore } from '@/store';
import registry from '@/registry';
import Controller from './Controller';
import TaskProgress from './TaskProgress';
import notActiveUrl from '@/assets/svg/workspace-not-active.svg';
import { useTranslation } from '@/hooks/useTranslation';
import { MessageToolChunk } from '@/types';
import { ToolIconEmpty } from '@/registry/common/icons';
import useTakeOverPhone from './useTakeOverPhone';
import { CloudPhone } from '@/components/Infra';
import { isDevOrTest } from '@/utils';
import CollapseSvg from '@/assets/svg/collapse.svg?react';
import { isWebsitePreviewMessage } from '@/registry/website_delivery';
import classNames from 'classnames';
import { shouldRenderToolDetailWhilePending } from '@/registry/common/imageTool';
import { getActiveWorkspaceMessage, isWorkspaceDisabledForMessage } from '@/components/Agent/workspaceVisibility';

const CollapseIcon = () => <CollapseSvg aria-hidden="true" />;

const Workspace = () => {
  const { t } = useTranslation();
  const {
    workspaceVisible,
    setWorkspaceVisible,
    workspaceMessages,
    pipelineTargetMessage,
    previewConfig,
    rightPanelExternalControl,
    setLastWorkspaceAction,
    fileViewerFile,
    taskPlan,
    cloudPhoneAuthInfo,
    autoOpenRightPanel,
    disableWorkspaceRendering,
  } = useAgentStore();
  const [renderMessage, setRenderMessage] = useState<MessageToolChunk>();

  const isWebsitePreview = isWebsitePreviewMessage(renderMessage);

  const [isRealTime, setIsRealTime] = useState(false);

  const [forceShowPhone, setForceShowPhone] = useState(false);

  const { needTakeOverPhone, authInfo, canTakeOverPhone } = useTakeOverPhone(isRealTime);

  const workspaceRenderer = (message) => {
    if (needTakeOverPhone || forceShowPhone) {
      // Stable key so React reuses the phone instance while the ID is unchanged
      const stableKey = `phone-${authInfo?.user_id}-${authInfo?.instance_no}`;
      return (
        <div key="phone-wrapper" className="w-full h-full flex justify-center items-center">
          <CloudPhone key={stableKey} needHumanIntervention authInfo={authInfo} />
        </div>
      );
    }

    if (cloudPhoneAuthInfo && message?.type?.startsWith('phone_rpa_')) {
      // Keep the same key format
      const stableKey = `phone-${cloudPhoneAuthInfo?.user_id}-${cloudPhoneAuthInfo?.instance_no}`;
      return (
        <div key="phone-wrapper" className="w-full h-full flex justify-center items-center">
          <CloudPhone key={stableKey} authInfo={cloudPhoneAuthInfo} />
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
      // Browser tools still render a sandbox while pending
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
      // Image generation keeps its pending placeholder in the detail renderer
      if (shouldRenderToolDetailWhilePending(message)) {
        return <Detail key="detail" message={message} isRealTime={isRealTime} />;
      }
      return (
        <div className={classNames('w-full h-full flex justify-center items-center', {
          'bg-white border border-[#eaeaea] rounded-[20px]': isWebsitePreview,
        })}>
          <Spin spinning />
        </div>
      );
    }

    return <Detail key="detail" message={message} isRealTime={isRealTime} />;
  };

  const handleWorkspaceClose = () => {
    // Record the trigger source
    setLastWorkspaceAction('user');
    // Update state and notify listeners
    setWorkspaceVisible(false);
  };

  const getMessageTypeIcon = (type: string) => {
    if (!type) {
      return <ToolIconEmpty />;
    }
    const Icon = registry.getToolIcon(type);
    return <Icon width={16} height={16} />;
  };

  useEffect(() => {
    const targetMessage = getActiveWorkspaceMessage(workspaceMessages, pipelineTargetMessage);

    if (isWorkspaceDisabledForMessage(targetMessage)) {
      if (renderMessage !== undefined) {
        setRenderMessage(undefined);
      }
      setWorkspaceVisible(false);
      return;
    }

    if (targetMessage !== renderMessage) {
      setRenderMessage(targetMessage);
    }

    // Open workspace only after the user clicks a tool
    if (pipelineTargetMessage?.type && !!registry.getMessageType(pipelineTargetMessage?.type)?.detailRenderer) {
      setWorkspaceVisible(true);
    }
  }, [workspaceMessages, pipelineTargetMessage, setWorkspaceVisible, renderMessage]);

  const preMessageId = useRef<string | null>(null);
  useEffect(() => {
    preMessageId.current = pipelineTargetMessage?.id;
  }, [pipelineTargetMessage]);

  // Auto-open workspace in a dedicated effect
  useEffect(() => {
    if (!autoOpenRightPanel || disableWorkspaceRendering) {
      return;
    }
    // Skip auto-open when FileViewer is already visible
    if (fileViewerFile) {
      console.log('[Workspace Auto Open] fileViewer is open, skip auto-open');
      return;
    }

    // Honor an externally closed workspace
    const externallyClosed = rightPanelExternalControl && previewConfig?.rightPanelVisible === false;
    if (externallyClosed) {
      console.log('[Workspace Auto Open] externally closed, skip auto-open');
      return;
    }

    // No-op when workspace is already open
    if (workspaceVisible) {
      console.log('[Workspace Auto Open] workspace already open');
      return;
    }

    if (preMessageId.current === pipelineTargetMessage?.id) {
      console.log('[Workspace Auto Open] message unchanged, skip auto-open');
      return;
    }

    // Open workspace only after the user clicks a tool
    if (
      pipelineTargetMessage?.type &&
      !isWorkspaceDisabledForMessage(pipelineTargetMessage) &&
      !!registry.getMessageType(pipelineTargetMessage.type)?.detailRenderer
    ) {
      console.log('[Workspace Auto Open] tool clicked, opening workspace', {
        type: pipelineTargetMessage.type,
        fileViewerFile: !!fileViewerFile,
        workspaceVisible,
      });
      // Record the trigger source and update state
      setLastWorkspaceAction('tool');
      setWorkspaceVisible(true);
    }
  }, [
    pipelineTargetMessage,
    setWorkspaceVisible,
    setLastWorkspaceAction,
    previewConfig?.rightPanelVisible,
    rightPanelExternalControl,
    fileViewerFile,
    workspaceVisible,
    autoOpenRightPanel,
    disableWorkspaceRendering,
  ]);

  // Dev/test only
  const showTakeOver = canTakeOverPhone && isDevOrTest();

  return (
    workspaceVisible && (
      <div
        className={`flex flex-col w-full h-full min-w-0 !pl-0 !pr-0 !bg-transparent ${
          isWebsitePreview ? '!py-0' : '!py-4'
        }`}
      >
        {isWebsitePreview ? (
          // website preview: only show the tool detail, without the surrounding workspace chrome.
          <div className="w-full h-full overflow-hidden">{workspaceRenderer(renderMessage)}</div>
        ) : (
          <div className="flex flex-col w-full h-full !bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0px_0px_36px_0px_rgba(0,0,0,0.06)] overflow-hidden relative">
            {/* Card Header */}
            <div className="flex justify-between items-center h-[56px] px-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 bg-[#F3F3F3] border border-[#EBEBEB] rounded-[6px] flex-shrink-0">
                  <div className="text-[12px] flex items-center justify-center">
                    {getMessageTypeIcon(renderMessage?.type)}
                  </div>
                </div>
                <div className="text-sm font-normal text-black whitespace-nowrap">
                  {renderMessage?.detail?.action || ''}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                className="flex items-center justify-center !w-6 !h-6 !p-0 text-black hover:text-black hover:bg-black/5"
                icon={<CollapseIcon />}
                onClick={handleWorkspaceClose}
                aria-label={t('workspace.collapse')}
              />
            </div>

            {/* Inner Preview Frame */}
            <div className="flex flex-col flex-1 px-4 pb-4 overflow-hidden">
              <div className="flex-1 flex flex-col h-full border border-[#EAEAEA] rounded-[12px] overflow-hidden bg-white">
                {/* Inner Frame Subheader */}
                <div className="h-[36px] flex justify-center items-center bg-[#FAFAFA] border-b border-[#EAEAEA] text-sm text-black flex-shrink-0">
                  {renderMessage?.type
                    ?.split?.('_')
                    ?.map((word) => word?.charAt(0)?.toUpperCase() + word?.slice(1))
                    ?.join(' ') || t('tool')}
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-hidden relative">{workspaceRenderer(renderMessage)}</div>

                {/* Controller Strip */}
                <div className="border-t border-[#EDEDED] shadow-[0px_-2px_8px_0px_rgba(0,0,0,0.04)] bg-[#FAFAFA] flex-shrink-0">
                  <Controller onRealTimeChange={setIsRealTime} />
                </div>
              </div>
            </div>

            {/* Task Progress row - inside the card at the bottom */}
            {/* pb-4 keeps a 16px gap under Controller when task progress is hidden */}
            {taskPlan && taskPlan.length > 0 && (
              <div className="px-4 pb-4 flex-shrink-0">
                <TaskProgress variant="compact" compactExpandedStyle="workspaceCard" />
              </div>
            )}
          </div>
        )}
      </div>
    )
  );
};

export default Workspace;
