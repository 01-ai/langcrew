import React from 'react';
import { DetailRendererProps } from '..';
import Search from '@/components/Infra/Search';
import { MessageToolChunk, WebSearchResultItem } from '@/types';
import { isJsonString } from '@/utils/json';
import useToolContent from '../common/useToolContent';

const WebSearchDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const content = useToolContent(message as unknown as MessageToolChunk);

  const data = isJsonString(content) ? JSON.parse(content) : [];

  const list = data.map((item: WebSearchResultItem) => ({
    link: item.metadata.url,
    title: item.title,
    description: item.metadata.snippet,
    icon: item.metadata.favicon,
  }));

  return <Search data={list} />;
};

export default WebSearchDetailRenderer;
