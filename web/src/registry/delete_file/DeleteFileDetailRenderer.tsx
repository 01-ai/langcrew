import React from 'react';
import { DetailRendererProps } from '..';
import FileContentRender from '@/components/Infra/FileContentRender';
import { MessageToolChunk } from '@/types';
import useToolContent from '../common/useToolContent';
import { getFileExtension } from '@/utils/parser';

const DeleteFileDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const content = useToolContent(message as unknown as MessageToolChunk);
  return (
    <FileContentRender
      fileExtension={getFileExtension(message.detail?.param?.path)}
      fileContent={content || (message as MessageToolChunk).detail?.param?.content}
    />
  );
};

export default DeleteFileDetailRenderer;
