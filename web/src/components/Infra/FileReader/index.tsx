import { useUrlContent } from '@/hooks/useUrlContent';
import React, { FC, memo, useEffect } from 'react';
import FileContentRender from '../FileContentRender';
import ImageDetailRenderer from '@/registry/common/ImageDetailRenderer';
import { Spin } from 'antd';
import OfficeFilePreview from './OfficeFilePreview';
import UnsupportedFilePreview from './UnsupportedFilePreview';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import type { FilePreviewConfig } from '@/types';
import {
  canPreviewFile,
  isImagePreviewFile,
  isOfficePreviewFile,
  isPdfPreviewFile,
  isTextPreviewFile,
  isVideoPreviewFile,
  resolveOfficeFileTypeFromContentType,
  resolvePreviewFileExtension,
  shouldFetchFileContentForPreview,
} from '@/utils/filePreview';

const localOfficePreviewTypes = new Set(['docx', 'xlsx', 'pptx']);

export interface FileReaderProps {
  url: string;
  filename?: string;
  contentType?: string;
  filePreviewConfig?: FilePreviewConfig;
}

const getOfficePreviewUrl = (fileUrl: string, officeConfig?: FilePreviewConfig['office']): string => {
  const customPreviewUrlGetter = officeConfig?.getPreviewUrl;
  if (!customPreviewUrlGetter) {
    return '';
  }

  try {
    return customPreviewUrlGetter(fileUrl) || '';
  } catch (error) {
    console.error('Failed to get custom office preview URL:', error);
    return '';
  }
};

const renderOfficePreview = (
  url: string,
  fileType: string | null | undefined,
  filePreviewConfig?: FilePreviewConfig,
  filename?: string,
) => {
  const customPreviewUrl = getOfficePreviewUrl(url, filePreviewConfig?.office);
  if (customPreviewUrl) {
    return (
      <iframe
        id="file-iframe"
        src={customPreviewUrl}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  if (fileType && localOfficePreviewTypes.has(fileType)) {
    return <OfficeFilePreview url={url} fileType={fileType} />;
  }

  return <UnsupportedFilePreview url={url} filename={filename} />;
};

/**
 * @param url File URL. The URL may have no extension; use `type` to detect the file kind
 * @param type MIME type such as text/csv
 */
const FileReader: FC<FileReaderProps> = ({
  url,
  contentType,
  filename,
  filePreviewConfig: filePreviewConfigProp,
}) => {
  const { t } = useTranslation();
  const { filePreviewConfig } = useAgentStore();
  const resolvedFilePreviewConfig = filePreviewConfigProp ?? filePreviewConfig;

  const previewOptions = { url, filename, contentType };
  const ext = resolvePreviewFileExtension(previewOptions);
  const isOfficeFile = isOfficePreviewFile(ext, contentType);
  const shouldFetchContent = shouldFetchFileContentForPreview(previewOptions);

  const { data, loading, fileType, blobUrl, error } = useUrlContent({
    url: shouldFetchContent ? url : null,
    contentType,
  });

  const resolvedPreviewOptions = { ...previewOptions, detectedFileType: fileType };

  useEffect(() => {
    // Revoke blob URLs on unmount
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (isImagePreviewFile(ext, contentType)) {
    return <ImageDetailRenderer imageUrl={url} />;
  }

  if (isOfficeFile && ext) {
    return renderOfficePreview(url, ext, resolvedFilePreviewConfig, filename);
  }

  if (!ext && isOfficePreviewFile('', contentType)) {
    return renderOfficePreview(
      url,
      resolveOfficeFileTypeFromContentType(contentType),
      resolvedFilePreviewConfig,
      filename,
    );
  }

  if (shouldFetchContent && loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin />
      </div>
    );
  }

  if (shouldFetchContent && error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 font-semibold text-lg mb-2">❌ {t('file.load.failed')}</div>
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!ext && !canPreviewFile(resolvedPreviewOptions)) {
    return <UnsupportedFilePreview url={url} filename={filename} />;
  }

  if (isTextPreviewFile(ext, contentType)) {
    return (
      <FileContentRender
        key={url}
        fileContent={data || ''}
        fileExtension={ext}
        contentType={contentType}
        isDiff={false}
      />
    );
  }

  if (!ext && isOfficePreviewFile('', contentType, fileType)) {
    return renderOfficePreview(url, fileType, resolvedFilePreviewConfig, filename);
  }

  if (isPdfPreviewFile(ext, contentType, fileType)) {
    return (
      <iframe id="file-iframe" src={blobUrl || url} style={{ width: '100%', height: '100%' }} />
    );
  }

  if (isVideoPreviewFile(ext, contentType)) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <video src={url} controls className="max-w-[100%] max-h-[100%]" autoPlay muted loop />
      </div>
    );
  }

  return <UnsupportedFilePreview url={url} filename={filename} />;
};

export default memo(FileReader);
