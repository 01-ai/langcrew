import React from 'react';
import { DetailRendererProps } from '..';
import ImageDetailRenderer from '../common/ImageDetailRenderer';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import ErrorDetailRenderer from '../common/ErrorDetailRenderer';
import { getTranslation } from '@/hooks/useTranslation';
import { getImageUrlFromToolMessage } from '../common/imageTool';

const ImageParserDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const toolMessage = message as MessageToolChunk;
  const { content } = useToolContent(toolMessage);
  const imageUrl = getImageUrlFromToolMessage(toolMessage, content);

  if (!imageUrl) {
    return <ErrorDetailRenderer errorMessage={getTranslation('error.image.parser.failed')} />;
  }

  return <ImageDetailRenderer imageUrl={imageUrl} />;
};

export default ImageParserDetailRenderer;
