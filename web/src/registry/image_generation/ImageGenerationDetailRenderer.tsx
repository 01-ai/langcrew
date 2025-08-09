import React from 'react';
import { DetailRendererProps } from '..';
import ImageDetailRenderer from '../common/ImageDetailRenderer';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';
import { getTranslation } from '@/hooks/useTranslation';
import ErrorDetailRenderer from '../common/ErrorDetailRenderer';

const ImageGenerationDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const content = useToolContent(message as MessageToolChunk);

  const { image_url } = isJsonString(content) ? JSON.parse(content) : {};

  if (!image_url) {
    return <ErrorDetailRenderer errorMessage={getTranslation('error.image.generation.failed')} />;
  }

  return <ImageDetailRenderer imageUrl={image_url} />;
};

export default ImageGenerationDetailRenderer;
