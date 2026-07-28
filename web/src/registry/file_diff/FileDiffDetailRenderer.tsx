import React from 'react';
import { DetailRendererProps } from '..';
import FileContentRender from '@/components/Infra/FileContentRender';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';
import { getFileExtension } from '@/utils/parser';

const FileDiffDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content, contentType } = useToolContent(message as unknown as MessageToolChunk);
  const result = message.detail?.result;
  // New schema: artifact directly contains { old_file_content, new_file_content }
  // Old schema: content is a JSON string with { old_file_content, new_file_content }
  const artifact = result?.artifact;
  const parsed = isJsonString(content) ? JSON.parse(content) : {};
  const old_file_content = artifact?.old_file_content ?? parsed.old_file_content;
  const new_file_content = artifact?.new_file_content ?? parsed.new_file_content;

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
