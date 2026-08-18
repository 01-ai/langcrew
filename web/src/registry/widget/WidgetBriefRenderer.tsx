import React from 'react';
import { BriefRendererProps } from '..';
import { WidgetRender } from '@/components/WidgetRender';
import { useAgentStore } from '@/store';

/**
 * WidgetBriefRenderer - Renders widget messages using the JSON-to-JSX engine
 * Converts widget data to React components
 */
const WidgetBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  const { sessionInfo } = useAgentStore();

  // whether the session is active
  const sessionActive = sessionInfo?.status !== 'ARCHIVED';

  const userInputable = sessionActive && message.isLast;

  return (
    <div className="w-chatkit-renderer">
      <WidgetRender json={message.detail?.widget} isPreviewMode={!userInputable} />
    </div>
  );
};

export default WidgetBriefRenderer;
