import React from 'react';
import { DetailRendererProps } from '..';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { Code, Markdown } from '@/components/Infra';

const DefaultDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content, contentType } = useToolContent(message as MessageToolChunk);
  if (contentType === 'text/markdown' || contentType === 'markdown') {
    return <Markdown content={content} />;
  }
  return <Code code={content} isDiff={false} />;
};

export default DefaultDetailRenderer;
