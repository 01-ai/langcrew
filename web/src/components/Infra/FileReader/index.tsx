import { useUrlContent } from '@/hooks/useUrlContent';
import React, { FC, memo, useEffect, useState } from 'react';
import FileContentRender, { fileContentSupportFileTypes } from '../FileContentRender';
import ImageDetailRenderer from '@/registry/common/ImageDetailRenderer';
import { getFileExtension } from '@/utils/parser';
import { Spin } from 'antd';
import OfficeFilePreview from './OfficeFilePreview';
import { devLog } from '@/utils';

const prefix = 'https://view.officeapps.live.com/op/embed.aspx?src=';

const officeFileExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
// 纯文本文件后缀名
const plaintextFileExtensions = [
  'txt',
  'log',
  'md',
  'csv',
  'json',
  'xml',
  'yaml',
  'yml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'toml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'toml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'toml',
];
// 代码文件后缀名
const codeFileExtensions = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'sh',
  'bash',
  'html',
  'css',
  'less',
  'scss',
  'json',
  'xml',
  'yaml',
  'yml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'toml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'toml',
];

export interface FileReaderProps {
  url: string;
  filename?: string;
  contentType?: string;
}

/**
 * @param url 文件url，注意：URL可能不带后缀名，需要通过type参数来判断文件类型
 * @param type 文件类型，text/csv 这种样子的
 */
const FileReader: FC<FileReaderProps> = ({ url, contentType, filename }) => {
  const { data, loading, fileType, blobUrl, error } = useUrlContent({ url, contentType });

  const ext = getFileExtension(url) || getFileExtension(filename);
  devLog(url, filename, contentType, ext);

  const isImage =
    ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ||
    ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'].includes(contentType);

  useEffect(() => {
    // 组件卸载时释放blob URL
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, []);

  const renderUrl = (): string => {
    if (officeFileExtensions.some((ext) => url.endsWith(ext))) {
      return prefix + encodeURIComponent(url);
    }

    if (fileType === 'pdf') {
      return blobUrl;
    }

    return url;
  };

  if (isImage) {
    return <ImageDetailRenderer imageUrl={url} />;
  }

  devLog(fileContentSupportFileTypes, ext, contentType);
  if (
    fileContentSupportFileTypes.includes(ext) ||
    plaintextFileExtensions.includes(ext) ||
    codeFileExtensions.includes(ext)
  ) {
    return <FileContentRender key={url} fileContent={data || error || ''} fileExtension={ext} isDiff={false} />;
  }

  // 预览链接不带后缀名，需要通过contentType来判断文件类型
  if (!ext && ['docx', 'xlsx', 'pptx'].includes(fileType)) {
    return <OfficeFilePreview url={url} fileType={fileType} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin />
      </div>
    );
  }

  return <iframe id="file-iframe" src={renderUrl()} style={{ width: '100%', height: '100%' }} />;
};

export default memo(FileReader);
