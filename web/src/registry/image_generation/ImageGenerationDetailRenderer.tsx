import React from 'react';
import { DetailRendererProps } from '..';
import ImageDetailRenderer from '../common/ImageDetailRenderer';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';
import { getTranslation } from '@/hooks/useTranslation';
import ErrorDetailRenderer from '../common/ErrorDetailRenderer';
import ImageGenerationPendingView from './ImageGenerationPendingView';

const ImageGenerationDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const toolMessage = message as MessageToolChunk;
  const status = toolMessage?.detail?.status;
  const { content } = useToolContent(message as MessageToolChunk);

  if (status === 'running' || status === 'pending') {
    return <ImageGenerationPendingView />;
  }

  const { image_url } = isJsonString(content) ? JSON.parse(content) : {};
  const imageUrl = image_url || toolMessage?.detail?.result?.image_url;

  if (!imageUrl) {
    return <ErrorDetailRenderer errorMessage={getTranslation('error.image.generation.failed')} />;
  }

  return <ImageDetailRenderer imageUrl={imageUrl} />;
};

export default ImageGenerationDetailRenderer;
