import React from 'react';
import { DetailRendererProps } from '..';
import FileContentRender from '@/components/Infra/FileContentRender';
import { MessageToolChunk } from '@/types';
import useToolContent from '../common/useToolContent';
import { getFileExtension } from '@/utils/parser';

const DeleteFileDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content, contentType } = useToolContent(message as unknown as MessageToolChunk);
  return (
    <FileContentRender
      fileContent={content || (message as MessageToolChunk).detail?.param?.content}
      fileExtension={getFileExtension(message.detail?.param?.path)}
      contentType={contentType}
    />
  );
};

export default DeleteFileDetailRenderer;
