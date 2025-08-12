import React from 'react';
import { DetailRendererProps } from '..';
import FileContentRender from '@/components/Infra/FileContentRender';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';

const FileParserDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content, contentType } = useToolContent(message as unknown as MessageToolChunk);
  return <FileContentRender fileContent={content} fileExtension="txt" contentType={contentType} />;
};

export default FileParserDetailRenderer;
