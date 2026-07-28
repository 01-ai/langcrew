import React from 'react';

import { useAgentStore } from '@/store';
import FileReader from '@/components/Infra/FileReader';
import { E2BFile, FileItem } from '@/types';
import FileViewerCloseSvg from '@/assets/svg/fileviewer/close.svg?react';
import FileViewerDownloadSvg from '@/assets/svg/fileviewer/download.svg?react';
import FileViewerFileViewSvg from '@/assets/svg/fileviewer/file-view.svg?react';
import FileViewerZoomOutSvg from '@/assets/svg/fileviewer/zoom-out.svg?react';
import classNames from 'classnames';
import { downloadAttachment } from '@/utils/file';
import { useTranslation } from '@/hooks/useTranslation';
import { appendQueryParam } from '@/utils/parser';

const FileViewer = () => {
  const { t } = useTranslation();
  const {
    fileViewerFile,
    setFileViewerFile,
    fileViewerMaximized,
    setFileViewerMaximized,
    setLastWorkspaceAction,
    fileViewerSiblings,
  } = useAgentStore();

  const isImage = (file: E2BFile | FileItem) => {
    const contentType = (file as E2BFile)?.content_type || (file as FileItem)?.type;
    return contentType?.startsWith('image/');
  };

  const allSiblingsAreImages =
    fileViewerSiblings &&
    fileViewerSiblings.length > 1 &&
    fileViewerSiblings.every((file) => isImage(file));

  const fileViewerRenderer = () => {
    if (!fileViewerFile) return null;
    const fileUrl = fileViewerFile.url;
    if (!fileUrl) return null;

    // const size = fileViewerFile.size;
    // Append size=xxx to the URL to invalidate cached content after the model modifies a file.
    // const url = typeof size === 'number' ? appendQueryParam(fileUrl, 'size', size) : fileUrl;
    const url = fileUrl;

    return (
      <FileReader
        key={url} // Remount when the URL changes instead of waiting for content to update.
        url={url}
        contentType={(fileViewerFile as E2BFile).content_type || (fileViewerFile as FileItem).type}
        filename={(fileViewerFile as E2BFile)?.filename || (fileViewerFile as FileItem)?.name}
      />
    );
  };

  const handleFileViewerClose = () => {
    setLastWorkspaceAction('user');
    setFileViewerFile(undefined);
  };

  const filename = (fileViewerFile as E2BFile)?.filename || (fileViewerFile as FileItem)?.name;

  if (!fileViewerFile) {
    return null;
  }

  return (
    <div
      className={classNames('flex flex-col h-full bg-white w-full min-w-0', {
        'border-l border-[#e9e9e9]': !fileViewerMaximized,
        'fixed inset-0 z-[1000]': fileViewerMaximized,
      })}
    >
      <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 border-b border-[#e9e9e9]">
        <div className="min-w-0 flex items-center gap-2">
          <div className="bg-[#f3f3f3] border border-[#ebebeb] rounded-[6px] w-6 h-6 flex items-center justify-center shrink-0">
            <FileViewerFileViewSvg width={17} height={11} className="block" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-[14px] leading-5 text-black overflow-hidden text-ellipsis whitespace-nowrap">
            {filename}
          </div>
        </div>

        <div className="flex items-center justify-end gap-5 shrink-0">
          <button
            type="button"
            className="h-9 border border-[#d8d8d8] rounded-[8px] px-3 py-2 flex items-center gap-1 text-[14px] leading-5 text-black"
            onClick={() => downloadAttachment(fileViewerFile)}
            aria-label={t('attachment.download')}
            title={t('attachment.download')}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <FileViewerDownloadSvg width={16} height={16} className="block" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap">{t('attachment.download')}</span>
          </button>

          {!fileViewerMaximized && (
            <button
              type="button"
              className="p-1 rounded-[4px] text-black hover:bg-[#f3f3f3] active:bg-[#ededed]"
              onClick={() => setFileViewerMaximized(true)}
              aria-label={t('file.zoom.in')}
              title={t('file.zoom.in')}
            >
              <FileViewerZoomOutSvg width={14} height={14} className="block" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className="p-1 rounded-[4px] text-black hover:bg-[#f3f3f3] active:bg-[#ededed]"
            onClick={handleFileViewerClose}
            aria-label={t('button.close')}
            title={t('button.close')}
          >
            <FileViewerCloseSvg width={12} height={12} className="block" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={classNames('flex-1 overflow-auto relative flex', { 'p-5': !fileViewerMaximized })}>
        <div className="flex-1 h-full overflow-hidden">{fileViewerRenderer()}</div>
        {allSiblingsAreImages && fileViewerMaximized && (
          <div className="flex flex-col gap-2 p-2 shrink-0 border-l border-[#e9e9e9] justify-center w-16">
            {fileViewerSiblings.map((sibling, idx) => {
              const isSelected = sibling.url === fileViewerFile.url;
              return (
                <div
                  key={sibling.url || idx}
                  className={classNames(
                    'cursor-pointer rounded-[8px] overflow-hidden border transition-all',
                    isSelected ? 'border-[#2781ff] size-12' : 'border-transparent size-10 opacity-60 hover:opacity-100',
                  )}
                  onClick={() => {
                    setLastWorkspaceAction('user');
                    setFileViewerFile(sibling, fileViewerSiblings);
                  }}
                >
                  <img
                    src={sibling.url}
                    alt={(sibling as E2BFile).filename || (sibling as FileItem).name}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
