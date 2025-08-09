import React from 'react';
import { DetailRendererProps } from '..';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { Code } from '@/components/Infra';

const DefaultDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const content = useToolContent(message as MessageToolChunk);
  return <Code code={content} isDiff={false} />;
};

export default DefaultDetailRenderer;
