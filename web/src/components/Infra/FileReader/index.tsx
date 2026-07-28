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

const defaultOfficePreviewPrefix = 'https://view.officeapps.live.com/op/embed.aspx?src=';

export interface FileReaderProps {
  url: string;
  filename?: string;
  contentType?: string;
  filePreviewConfig?: FilePreviewConfig;
}

const getDefaultOfficePreviewUrl = (fileUrl: string): string => {
  // Encode the complete file URL before passing it as the Office viewer src so signed queries remain intact.
  return defaultOfficePreviewPrefix + encodeURIComponent(fileUrl);
};

const getOfficePreviewUrl = (fileUrl: string, officeConfig?: FilePreviewConfig['office']): string => {
  const customPreviewUrlGetter = officeConfig?.getPreviewUrl;
  if (!customPreviewUrlGetter) {
    return getDefaultOfficePreviewUrl(fileUrl);
  }

  try {
    return customPreviewUrlGetter(fileUrl) || getDefaultOfficePreviewUrl(fileUrl);
  } catch (error) {
    console.error('Failed to get custom office preview URL:', error);
    return getDefaultOfficePreviewUrl(fileUrl);
  }
};

const renderOfficeWithoutExtension = (
  url: string,
  contentType: string | undefined,
  filePreviewConfig?: FilePreviewConfig,
) => {
  if (filePreviewConfig?.office?.getPreviewUrl) {
    return (
      <iframe
        id="file-iframe"
        src={getOfficePreviewUrl(url, filePreviewConfig.office)}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  const officeTypeFromMime = resolveOfficeFileTypeFromContentType(contentType);
  if (officeTypeFromMime) {
    return <OfficeFilePreview url={url} fileType={officeTypeFromMime} />;
  }

  return (
    <iframe
      id="file-iframe"
      src={getOfficePreviewUrl(url, filePreviewConfig?.office)}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

/**
 * @param url File URL. It may not have an extension, so use type to determine the file format.
 * @param type File MIME type, such as text/csv.
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
    // Revoke the blob URL when the component unmounts.
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
    return (
      <iframe
        id="file-iframe"
        src={getOfficePreviewUrl(url, resolvedFilePreviewConfig?.office)}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  if (!ext && isOfficePreviewFile('', contentType)) {
    return renderOfficeWithoutExtension(url, contentType, resolvedFilePreviewConfig);
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
    if (resolvedFilePreviewConfig?.office?.getPreviewUrl) {
      return (
        <iframe
          id="file-iframe"
          src={getOfficePreviewUrl(url, resolvedFilePreviewConfig.office)}
          style={{ width: '100%', height: '100%' }}
        />
      );
    }

    return <OfficeFilePreview url={url} fileType={fileType} />;
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
