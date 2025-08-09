import React from 'react';
import { DetailRendererProps } from '..';
import ImageDetailRenderer from '../common/ImageDetailRenderer';

const ImageParserDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  return <ImageDetailRenderer imageUrl={message?.detail?.param?.image_url} />;
};

export default ImageParserDetailRenderer;
