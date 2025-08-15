import React from 'react';
import { DetailRendererProps } from '..';
import { MessageToolChunk } from '@/types';
import Terminal from '@/components/Infra/Terminal';
import useToolContent from '../common/useToolContent';

const TerminalDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content } = useToolContent(message as MessageToolChunk);

  return (
    <div className="w-full h-full">
      <Terminal content={content} />
    </div>
  );
};

export default TerminalDetailRenderer;
