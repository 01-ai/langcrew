import React from 'react';
import { BriefRendererProps } from '..';
import { Markdown } from '@/components/Infra';

const TextBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  return <Markdown content={message.content} />;
};

export default TextBriefRenderer;
