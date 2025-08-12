import React from 'react';
import { DetailRendererProps } from '..';
import FileContentRender from '@/components/Infra/FileContentRender';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';
import { getFileExtension } from '@/utils/parser';

const FileDiffDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content, contentType } = useToolContent(message as unknown as MessageToolChunk);
  const { old_file_content, new_file_content } = isJsonString(content) ? JSON.parse(content) : {};

  return (
    <FileContentRender
      fileContent={new_file_content}
      oldFileContent={old_file_content}
      fileExtension={getFileExtension(message.detail?.param?.path)}
      contentType={contentType}
    />
  );
};

export default FileDiffDetailRenderer;
