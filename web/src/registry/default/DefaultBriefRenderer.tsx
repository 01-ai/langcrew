import React from 'react';
import { BriefRendererProps } from '..';
import ToolBriefRenderer from '../common/ToolBriefRenderer';

const SILENT_MESSAGE_TYPES = new Set(['agent_end_task', 'message_result']);

const isMessageDebugEnabled = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('debugMessages') === 'true';
};

const DefaultBriefRenderer: React.FC<BriefRendererProps> = ({ message, withIcon = true }) => {
  if (SILENT_MESSAGE_TYPES.has(message.type)) {
    return null;
  }
  // Hide unregistered non-tool messages
  if (!message?.detail?.tool) {
    if (isMessageDebugEnabled()) {
      console.debug('unknown message type: ', message.type);
    }
    return null;
  }
  return <ToolBriefRenderer message={message} withIcon={withIcon} />;
};

export default DefaultBriefRenderer;
