import React, { memo } from 'react';
import { Button } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';
import { downloadAttachment, getFileIcon } from '@/utils/file';
import { getFileExtension } from '@/utils/parser';
import { E2BFile } from '@/types';

export interface UnsupportedFilePreviewProps {
  url: string;
  filename?: string;
}

const resolveDownloadFilename = (url: string, filename?: string): string => {
  if (filename) {
    return filename;
  }

  const extFromUrl = getFileExtension(url);
  const urlPath = url.split('?')[0].split('#')[0];
  const lastSegment = urlPath.substring(urlPath.lastIndexOf('/') + 1);

  try {
    const decoded = decodeURIComponent(lastSegment);
    if (decoded) {
      return decoded;
    }
  } catch {
    if (lastSegment) {
      return lastSegment;
    }
  }

  return extFromUrl ? `download.${extFromUrl}` : 'download';
};

const UnsupportedFilePreview: React.FC<UnsupportedFilePreviewProps> = ({ url, filename }) => {
  const { t } = useTranslation();
  const resolvedFilename = resolveDownloadFilename(url, filename);

  const handleDownload = () => {
    downloadAttachment({ url, filename: resolvedFilename } as E2BFile);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="w-12 h-12 flex items-center justify-center">{getFileIcon(resolvedFilename)}</div>
      <div className="text-[#333] text-sm max-w-full truncate">{resolvedFilename}</div>
      <div className="text-[#666] text-sm">{t('file.preview.unsupported')}</div>
      <Button type="primary" onClick={handleDownload}>
        {t('attachment.download')}
      </Button>
    </div>
  );
};

export default memo(UnsupportedFilePreview);
