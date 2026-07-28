import React from 'react';

import { MessageToolChunk } from '@/types';
import { useAgentStore } from '@/store';
import useToolContent from '../common/useToolContent';
import websiteDeliveryIconUrl from '@/assets/svg/website_delivery.svg';
import DownloadIcon from '@/assets/svg/fileviewer/download.svg?react';
import { getWebsitePreviewUrl, isWebsiteDeliveryMessage, parseWebsitePreviewContent } from './utils';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * End of delivery“Window”Card (matching draft: preserving original message position, adding a small preview window at the end)
 */
const WebsiteDeliveryEndWindow: React.FC<{ message: MessageToolChunk }> = ({ message }) => {
  const { t } = useTranslation();
  const { setPipelineTargetMessage } = useAgentStore();
  const toolStatus = message?.detail?.status;

  const { content } = useToolContent(message);
  const data = parseWebsitePreviewContent(content);
  const previewUrl = getWebsitePreviewUrl(message, content);

  const isCompleted = toolStatus && toolStatus !== 'running' && toolStatus !== 'pending';
  if (!isWebsiteDeliveryMessage(message)) return null;
  if (!isCompleted) return null;
  if (data?.success === false || !previewUrl) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = data?.zip?.url;
    if (!url) return;
    // Trigger download (browser may ignore) download Properties, so provide a new opening page)
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = data?.zip?.filename || 'website.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const titleText = data?.website_name || data?.service_name || message?.detail?.param?.website_name || t('website_delivery.default_name');
  const zipUrl = data?.zip?.url;

  return (
    <div
      className="w-[400px] h-[280px] bg-white border border-[#eaeaea] rounded-[20px] overflow-hidden cursor-pointer"
      onClick={() => setPipelineTargetMessage(message)}
    >
      <div className="w-full h-[44px] bg-[#f6f6f8] border-b border-[#eaeaea] flex items-center justify-between px-[16px] py-[12px]">
        <div className="flex items-center gap-[6px]">
          <div className="overflow-hidden rounded-[6px] w-[20px] h-[20px] flex items-center justify-center">
            <img src={websiteDeliveryIconUrl} alt="website delivery" className="w-[14px] h-[14px]" />
          </div>
          <p className="text-[14px] leading-[20px] text-black">{titleText}</p>
        </div>
        {zipUrl && (
          <button
            type="button"
            aria-label={t('attachment.download')}
            className="w-[24px] h-[24px] flex items-center justify-center rounded-[4px] transition-colors hover:bg-black/5 active:bg-black/10"
            onClick={handleDownload}
          >
            <DownloadIcon width={13} height={15} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="w-full h-[calc(100%-44px)] bg-white">
        <iframe
          title="website-delivery-mini-preview"
          src={previewUrl}
          className="w-full h-full pointer-events-none"
        />
      </div>
    </div>
  );
};

export default WebsiteDeliveryEndWindow;
