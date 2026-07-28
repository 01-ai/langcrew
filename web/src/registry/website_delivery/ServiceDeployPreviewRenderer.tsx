import React, { useState } from 'react';
import { Empty, Spin, message as antdMessage } from 'antd';

import { DetailRendererProps } from '..';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { useAgentStore } from '@/store';
import websiteDeliveryIconUrl from '@/assets/svg/website_delivery.svg';
import refreshIconUrl from '@/assets/svg/refresh.svg';
import shareIconUrl from '@/assets/svg/share.svg';
import closeIconUrl from '@/assets/svg/close.svg';
import { getWebsitePreviewUrl, parseWebsitePreviewContent } from './utils';
import { useTranslation } from '@/hooks/useTranslation';

const appendQueryParam = (url: string, key: string, value: string): string => {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
};

const ServiceDeployPreviewRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { t } = useTranslation();
  const toolMessage = message as MessageToolChunk;
  const { content } = useToolContent(toolMessage);
  const data = parseWebsitePreviewContent(content);
  const previewUrl = getWebsitePreviewUrl(toolMessage, content);
  const toolStatus = toolMessage?.detail?.status;
  const { setWorkspaceVisible, setFileViewerFile, setLastWorkspaceAction } = useAgentStore();
  const [refreshSeed, setRefreshSeed] = useState<number>(0);
  const [previewRefreshKey, setPreviewRefreshKey] = useState<number>(0);

  const containerClassName = 'w-full h-full bg-white border border-[#eaeaea] rounded-[20px] overflow-hidden';

  const handleRefresh = () => {
    setPreviewRefreshKey((k) => k + 1);
    setRefreshSeed(Date.now());
  };

  const handleShare = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      antdMessage.success(t('link.copied'));
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = previewUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        antdMessage.success(t('link.copied'));
      } catch {
        antdMessage.error(t('link.copy_failed'));
      }
    }
  };

  const handleClose = () => {
    setLastWorkspaceAction('user');
    setFileViewerFile(undefined);
    setWorkspaceVisible(false);
  };

  if (toolStatus === 'running' || toolStatus === 'pending') {
    return (
      <div className={containerClassName}>
        <div className="w-full h-full flex items-center justify-center">
          <Spin spinning />
        </div>
      </div>
    );
  }

  if (data?.success === false) {
    return (
      <div className="w-full h-full p-4 bg-white">
        <div className="text-[14px] font-medium mb-2">{t('service_deploy.failed')}</div>
        <div className="text-[#666] text-[12px] whitespace-pre-wrap break-words">
          {data.message || t('error.unknown')}
        </div>
      </div>
    );
  }

  const titleText = data?.website_name || data?.service_name || toolMessage?.detail?.param?.website_name || t('service_deploy.default_name');

  return (
    <div className={containerClassName}>
      <div className="flex justify-between items-center h-[56px] w-full px-[15px]">
        <div className="flex items-center gap-[8px] overflow-hidden">
          <div className="flex-shrink-0 bg-[#f3f3f3] border border-[#ebebeb] rounded-[6px] w-[24px] h-[24px] flex items-center justify-center">
            <img src={websiteDeliveryIconUrl} alt="service deploy" className="w-[13px] h-[13px]" />
          </div>
          <div className="text-[14px] leading-[20px] text-black flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {titleText}
          </div>
        </div>

        <div className="flex-1 h-[36px] flex items-center justify-end gap-[12px]">
          <button
            type="button"
            aria-label={t('action.refresh')}
            className="w-[24px] h-[24px] p-[4px] flex items-center justify-center rounded-[4px] transition-colors cursor-pointer hover:bg-[#f3f3f3] active:bg-[#ebebeb] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRefresh}
            disabled={!previewUrl}
          >
            <img src={refreshIconUrl} alt="refresh" className="w-[15px] h-[16px]" />
          </button>

          <button
            type="button"
            aria-label={t('action.share')}
            className="w-[24px] h-[24px] p-[4px] flex items-center justify-center rounded-[4px] transition-colors cursor-pointer hover:bg-[#f3f3f3] active:bg-[#ebebeb] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleShare}
            disabled={!previewUrl}
          >
            <img src={shareIconUrl} alt="share" className="w-[16px] h-[16px]" />
          </button>

          <button
            type="button"
            aria-label={t('button.close')}
            className="w-[24px] h-[24px] p-[4px] flex items-center justify-center rounded-[4px] transition-colors cursor-pointer hover:bg-[#f3f3f3] active:bg-[#ebebeb]"
            onClick={handleClose}
          >
            <img src={closeIconUrl} alt="close" className="w-[15px] h-[16px]" />
          </button>
        </div>
      </div>

      <div className="w-full h-[calc(100%-56px)] px-[15px] pb-[15px] bg-white">
        <div className="w-full h-full border border-[#eaeaea] rounded-[12px] overflow-hidden bg-white">
          {previewUrl ? (
            <iframe
              key={previewRefreshKey}
              title="service-deploy-preview"
              src={appendQueryParam(previewUrl, '__refresh', String(refreshSeed))}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('website_delivery.no_preview_url')} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceDeployPreviewRenderer;
