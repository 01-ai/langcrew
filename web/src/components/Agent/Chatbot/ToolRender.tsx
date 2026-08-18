import { MessagePlanChunk, MessageToolChunk } from '@/types';
import React, { useState } from 'react';
import ClickableTool from './ClickableTool';
import { useAgentStore } from '@/store';
import MessageBrief from '@/registry/common/MessageBrief';
import registry from '@/registry';
import Loading from '@/components/Infra/Loading';
import ExpandCollapseIcon from './ExpandCollapseIcon';
import { shouldRenderToolDetailWhilePending } from '@/registry/common/imageTool';

interface ToolRenderProps {
  message: MessageToolChunk;
  hasUserInput?: boolean;
  className?: string;
}

const ToolRender: React.FC<ToolRenderProps> = ({ message, hasUserInput, className }) => {
  const { setPipelineTargetMessage, layoutConfig, disableWorkspaceRendering } = useAgentStore();
  const narrowMode = layoutConfig.narrowMode;

  const [collapsed, setCollapsed] = useState(true);

  if (message.type === 'plan' && !(message as MessagePlanChunk)?.children?.length) {
    return null;
  }

  const isRunning = message.detail?.status === 'running' || message.detail?.status === 'pending';
  const shouldRenderWhilePending = shouldRenderToolDetailWhilePending(message);
  const disableToolWorkspace = registry.getMessageType(message.type)?.disableWorkspace === true;

  if (!narrowMode && (disableWorkspaceRendering || disableToolWorkspace)) {
    return disableToolWorkspace ? (
      <MessageBrief message={message} hasUserInput={hasUserInput} />
    ) : (
      <div
        className={`rounded-[16px] border flex items-center gap-[10px] px-3 py-2 text-[14px] leading-4 border-[#eaeaea] bg-[#f6f6f8] w-fit max-w-full relative ${
          className || ''
        }`}
      >
        <MessageBrief message={message} hasUserInput={hasUserInput} />
      </div>
    );
  }

  if (!narrowMode) {
    return (
      <ClickableTool onClick={() => setPipelineTargetMessage(message)} active={isRunning} className={className}>
        <MessageBrief message={message} hasUserInput={hasUserInput} />
      </ClickableTool>
    );
  }

  // Show tool detail results in embed mode
  const DetailRenderer = registry.getDetailRenderer(message.type);

  return (
    <div className="w-full border border-[#dedede] rounded-lg">
      {/* Tool title and status */}
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <MessageBrief message={message} hasUserInput={hasUserInput} />
        {isRunning ? <Loading /> : <ExpandCollapseIcon expanded={!collapsed} />}
      </div>
      {!collapsed && (!isRunning || shouldRenderWhilePending) && (
        <div className="w-full aspect-[3/2] border-t border-[#dedede] overflow-hidden">
          <DetailRenderer message={message} isRealTime={false} />
        </div>
      )}
    </div>
  );
};

export default ToolRender;
