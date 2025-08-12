import React from 'react';
import { DetailRendererProps } from '..';
import { isJsonString } from '@/utils/json';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';

const ServiceDeployDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content } = useToolContent(message as unknown as MessageToolChunk);
  const data = isJsonString(content) ? JSON.parse(content) : {};

  return (
    <div className="w-full h-full p-4">
      <iframe src={data.domain_url} className="w-full h-full" />
    </div>
  );
};

export default ServiceDeployDetailRenderer;
