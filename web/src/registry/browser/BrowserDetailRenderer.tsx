import React, { useEffect, useMemo, useState } from 'react';
import { DetailRendererProps } from '..';
import { useAgentStore } from '@/store';
import ImageDetailRenderer from '../common/ImageDetailRenderer';
import { Spin } from 'antd';

const BrowserDetailRenderer: React.FC<DetailRendererProps> = ({ message, isRealTime }) => {
  const sandboxUrl = message?.detail?.param?.sandbox_url || message?.detail?.result?.sandbox_url;

  // 使用 useMemo 缓存 iframe，只有当 sandbox_url 改变时才重新创建
  const iframeElement = useMemo(() => {
    if (!useAgentStore.getState().shareId && sandboxUrl) {
      return <iframe key={sandboxUrl} src={sandboxUrl} className="w-full h-full" />;
    }
    return null;
  }, [sandboxUrl]);

  const showSandbox = !useAgentStore.getState().shareId && isRealTime && sandboxUrl && !message?.isFinish;

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

  return <ImageDetailRenderer imageUrl={message?.detail?.result?.image_url} />;
};

export default BrowserDetailRenderer;
