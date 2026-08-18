import React from 'react';
import { DetailRendererProps } from '..';
import { isJsonString } from '@/utils/json';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { getWebsitePreviewUrl } from '../website_delivery/utils';

const ServiceDeployDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content } = useToolContent(message as unknown as MessageToolChunk);
  const data = isJsonString(content) ? JSON.parse(content) : {};
  const previewUrl = getWebsitePreviewUrl(message as MessageToolChunk, data);

  return (
    <div className="w-full h-full p-4">
      {previewUrl ? <iframe title="service-preview" src={previewUrl} className="w-full h-full" /> : null}
    </div>
  );
};

export default ServiceDeployDetailRenderer;
