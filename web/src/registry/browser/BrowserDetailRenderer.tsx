import React, { useEffect, useMemo, useState } from 'react';
import { DetailRendererProps } from '..';
import { useAgentStore } from '@/store';
import ImageDetailRenderer from '../common/ImageDetailRenderer';
import { Spin } from 'antd';

const BrowserDetailRenderer: React.FC<DetailRendererProps> = ({ message, isRealTime }) => {
  const { shareId } = useAgentStore();
  const result = message?.detail?.result;
  const sandboxUrl = message?.detail?.param?.sandbox_url || result?.sandbox_url || result?.artifact?.sandbox_url;

  // Memoize the iframe; recreate only when sandbox_url changes
  const iframeElement = useMemo(() => {
    if (!shareId && sandboxUrl) {
      return <iframe key={sandboxUrl} src={sandboxUrl} className="w-full h-full" />;
    }
    return null;
  }, [sandboxUrl, shareId]);

  const showSandbox = !shareId && isRealTime && sandboxUrl && !message?.isFinish;

  if (showSandbox) {
    return <div className="w-full h-full">{iframeElement}</div>;
  }

  if (message?.detail?.status === 'pending') {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Spin spinning />
      </div>
    );
  }

  return <ImageDetailRenderer imageUrl={result?.image_url || result?.artifact?.image_url} />;
};

export default BrowserDetailRenderer;
