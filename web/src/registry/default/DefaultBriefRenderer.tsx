import React from 'react';
import { BriefRendererProps } from '..';
import ToolBriefRenderer from '../common/ToolBriefRenderer';

const DefaultBriefRenderer: React.FC<BriefRendererProps> = ({ message, withIcon = true }) => {
  return <ToolBriefRenderer message={message} withIcon={withIcon} />;
};

export default DefaultBriefRenderer;
