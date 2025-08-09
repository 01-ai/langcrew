import React from 'react';
import registry, { BriefRendererProps } from '..';
import ToolContainer from '@/components/Infra/ToolContainer';

const ToolBriefRenderer: React.FC<BriefRendererProps> = ({ message, withIcon }) => {
  const Icon = registry.getToolIcon(message.type);
  return (
    <ToolContainer
      icon={withIcon ? <Icon /> : undefined}
      action={message.detail?.action || message.detail?.tool}
      param={message.detail?.action_content}
    ></ToolContainer>
  );
};

export default ToolBriefRenderer;
