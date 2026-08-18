import React, { useState } from 'react';
import { FileCard } from '@ant-design/x';
import { LoadingOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { E2BFile, FileItem } from '@/types';
import { Button, Modal, Tooltip } from 'antd';
import { FileReader } from '@/components/Infra';
import { FileViewerCloseIcon, FileViewerDownloadPngIcon } from '@/components/Infra/Icons';
import ViewIcon from '@/assets/svg/messageAttachments/view_1.svg?react';
import ViewActiveIcon from '@/assets/svg/messageAttachments/view_2.svg?react';
import DownloadIcon from '@/assets/svg/messageAttachments/download.svg?react';
import { downloadAttachment, getFileIcon, transformAttachmentToFileCard } from '@/utils/file';
import { useTranslation } from '@/hooks/useTranslation';
import { formatSize } from '@/utils/fileHelpers';
import { useFilePreview } from '@/hooks/useFilePreview';

// Types
interface AttachmentCardProps {
  attachment: E2BFile | FileItem;
  isActive: boolean;
  variant?: 'default' | 'large' | 'xlarge' | 'medium';
  siblings?: (E2BFile | FileItem)[];
}

// View state: hover-only, sticky blue when active
const ViewIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <div
    className={classNames('absolute top-1/2 -translate-y-1/2 right-2', {
      'opacity-0 group-hover:opacity-100': !isActive,
      'opacity-100': isActive,
    })}
  >
    <div className="border border-[#EAEAEA] rounded-[6px] p-1 w-[24px] h-[24px] flex items-center justify-center bg-white">
      {isActive ? <ViewActiveIcon /> : <ViewIcon />}
    </div>
  </div>
);

// Download button: hover-only, left of the view control
const DownloadButton: React.FC<{ attachment: E2BFile | FileItem }> = ({ attachment }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { t } = useTranslation();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    downloadAttachment(attachment).finally(() => {
      setIsDownloading(false);
    });
  };

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-9 opacity-0 group-hover:opacity-100">
      <Tooltip title={t('attachment.download')}>
        <div
          className="cursor-pointer border border-[#EAEAEA] rounded-[6px] p-1 w-[24px] h-[24px] flex items-center justify-center bg-white transition-colors hover:bg-[#0000000a]"
          onClick={handleDownload}
        >
          {isDownloading ? <LoadingOutlined /> : <DownloadIcon />}
        </div>
      </Tooltip>
    </div>
  );
};

// Attachment card
const AttachmentCard: React.FC<AttachmentCardProps> = ({
  attachment: initialAttachment,
  isActive,
  variant = 'default',
  siblings = [],
}) => {
  const [open, setOpen] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState(initialAttachment);
  const { previewFile } = useFilePreview();

  const handleClick = () => {
    const result = previewFile({
      file: initialAttachment,
      siblings,
      source: 'attachment',
      onOpenModal: () => {
        setActiveAttachment(initialAttachment);
        setOpen(true);
      },
    });

    if ('mode' in result && result.mode === 'modal') {
      setActiveAttachment(initialAttachment);
      setOpen(true);
    }
  };

  const isImage = (file: E2BFile | FileItem) =>
    (file as E2BFile).content_type?.startsWith('image/') || (file as FileItem).type?.startsWith('image/');

  const isVideo = (file: E2BFile | FileItem) =>
    (file as E2BFile).content_type?.startsWith('video/') || (file as FileItem).type?.startsWith('video/');

  const allSiblingsAreImages = siblings.length > 1 && siblings.every((s) => isImage(s));

  const isLargeImage = variant === 'large' && isImage(initialAttachment);
  const isXLargeImage = variant === 'xlarge' && isImage(initialAttachment);
  const isMediumImage = variant === 'medium' && isImage(initialAttachment);
  const isXLargeVideo = variant === 'xlarge' && isVideo(initialAttachment) && siblings.length === 1;

  const filename = (initialAttachment as E2BFile).filename || (initialAttachment as FileItem).name;
  const fileSize = (initialAttachment as E2BFile).size || (initialAttachment as FileItem).size;

  const modalFilename = (activeAttachment as E2BFile).filename || (activeAttachment as FileItem).name;

  return (
    <>
      <div className="cursor-pointer relative group" onClick={handleClick}>
        {isImage(initialAttachment) ? (
          <FileCard
            {...transformAttachmentToFileCard(initialAttachment)}
            imageProps={
              isXLargeImage
                ? {
                    preview: false,
                    // Fit the full image within the chat column
                    // Fit within the chat column, max height 360px, no crop or extra padding
                    styles: {
                      // wrapper
                      root: {
                        maxWidth: '100%',
                        lineHeight: 0, // Avoid an img baseline gap
                      },
                      // img
                      image: {
                        width: '100%',
                        height: 'auto',
                        maxHeight: 360,
                        objectFit: 'contain',
                        display: 'block', // Avoid an img baseline gap
                      },
                    },
                  }
                : isLargeImage || isMediumImage
                ? {
                    preview: false,
                    // Large/Medium: square thumbnail that fills the container
                    styles: {
                      root: {
                        lineHeight: 0, // Avoid an img baseline gap
                      },
                      image: {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block', // Avoid an img baseline gap
                      },
                    },
                  }
                : { preview: false }
            }
            classNames={{
              file: classNames(
                'bg-white border border-[#EAEAEA] hover:bg-[#0000000a]',
                isLargeImage || isXLargeImage ? 'rounded-[12px]' : isMediumImage ? 'rounded-[16px]' : 'rounded-xl',
              ),
            }}
            styles={{
              root: {
                ...(isXLargeImage
                  ? {
                      // XL: max width matches the chat column; height follows the image
                      maxWidth: '100%',
                      width: '100%',
                      height: 'auto',
                    }
                  : {
                      height: isLargeImage ? 176 : isMediumImage ? 120 : 56,
                      width: isLargeImage ? 176 : isMediumImage ? 120 : 56,
                      minWidth: isLargeImage ? 176 : isMediumImage ? 120 : 56,
                    }),
                boxSizing: 'border-box',
              },
              file: {
                ...(isXLargeImage
                  ? {
                      width: '100%',
                      // Let the image size itself, constrained by maxHeight
                      lineHeight: 0, // Avoid a trailing gap
                      fontSize: 0, // Avoid a trailing gap
                    }
                  : isLargeImage
                  ? {
                      width: '100%',
                      height: '100%',
                      lineHeight: 0, // Avoid a trailing gap
                      fontSize: 0, // Avoid a trailing gap
                    }
                  : {
                      width: '100%',
                      height: '100%',
                    }),
              },
            }}
          />
        ) : isXLargeVideo ? (
          // Video preview (single): same sizing constraints as XLarge image
          <div
            className={classNames(
              'bg-white border border-[#EAEAEA] hover:bg-[#0000000a] rounded-[12px] overflow-hidden',
            )}
            style={{
              maxWidth: '100%',
              width: '100%',
              height: 'auto',
              boxSizing: 'border-box',
              lineHeight: 0, // Avoid a video baseline gap
              fontSize: 0, // Avoid a trailing gap
            }}
          >
            <video
              src={(initialAttachment as any).url}
              preload="metadata"
              playsInline
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 360,
                objectFit: 'contain',
                display: 'block', // Avoid a video baseline gap
              }}
            />
          </div>
        ) : (
          // Align icon + text strictly to Figma spec (layout/spacing/typography).
          <div className="bg-white border border-[#EAEAEA] hover:bg-[#0000000a] rounded-[16px] h-[56px] w-[272px] min-w-[272px] box-border flex items-center pl-3 pr-16 py-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 shrink-0 flex items-center justify-center">{getFileIcon(filename)}</div>
              <div className="flex flex-col items-start justify-center text-[#000] flex-1 min-w-0">
                <div className="text-[14px] leading-[1.4] truncate w-full">{filename}</div>
                <div className="text-[10px] leading-[12px] opacity-30 truncate w-full">
                  {typeof fileSize === 'number' ? formatSize(fileSize) : ''}
                </div>
              </div>
            </div>
          </div>
        )}
        {!isImage(initialAttachment) && (
          <>
            <DownloadButton attachment={initialAttachment} />
            <ViewIndicator isActive={isActive} />
          </>
        )}
      </div>
      <Modal
        title={
          <div className="pb-4 gap-4 flex items-center justify-between flex-shrink-0 border-b border-[#e9e9e9]">
            <div className="flex-1 ">{modalFilename}</div>
            <Button
              type="text"
              icon={<FileViewerDownloadPngIcon style={{ width: 24, height: 24 }} />}
              onClick={() => downloadAttachment(activeAttachment)}
            />
            <Button
              type="text"
              icon={<FileViewerCloseIcon style={{ fontSize: 16 }} />}
              onClick={() => setOpen(false)}
            />
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={allSiblingsAreImages ? 900 : 800}
        height={600}
        closable={false}
      >
        <div className="w-full h-[600px] flex overflow-hidden">
          <div className="flex-1 h-full w-full">
            <FileReader
              key={activeAttachment.url} // Remount when the URL changes so stale content is not shown
              url={activeAttachment.url}
              contentType={(activeAttachment as E2BFile).content_type || (activeAttachment as FileItem).type}
              filename={(activeAttachment as E2BFile).filename || (activeAttachment as FileItem).name}
            />
          </div>
          {allSiblingsAreImages && (
            <div className="w-16 flex flex-col gap-2 p-2 shrink-0 border-l border-[#e9e9e9] justify-center">
              {siblings.map((sibling, idx) => {
                const isSelected = sibling.url === activeAttachment.url;
                return (
                  <div
                    key={sibling.url || idx}
                    className={classNames(
                      'cursor-pointer rounded-[8px] overflow-hidden border transition-all',
                      isSelected
                        ? 'border-[#2781ff] size-12'
                        : 'border-transparent size-10 opacity-60 hover:opacity-100',
                    )}
                    onClick={() => setActiveAttachment(sibling)}
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
      </Modal>
    </>
  );
};

export default AttachmentCard;
