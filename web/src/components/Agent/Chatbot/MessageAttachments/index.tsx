import React, { useState, useMemo, isValidElement, cloneElement } from 'react';
import { E2BFile, FileItem, MessageChunk } from '@/types';
import { useAgentStore } from '@/store';
import AttachmentCard from './AttachmentCard';
import AllFilesModal from './AllFilesModal';
import { getVisibleAttachments } from './utils';
import { isEqual } from 'lodash-es';
import { useTranslation } from '@/hooks/useTranslation';
import { getFileIcon } from '@/utils/file';
import classNames from 'classnames';

interface MessageAttachmentsProps {
  message: MessageChunk;
  isUserMessage?: boolean;
}

const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ message, isUserMessage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { fileViewerFile } = useAgentStore();
  const { t } = useTranslation();

  const viewAllIcon = useMemo(() => {
    // Use the exact same default icon as FileCard (see `getFileIcon` fallback).
    const icon = getFileIcon('file');
    return isValidElement(icon)
    ? cloneElement(icon as React.ReactElement<any>, { style: { width: 16, height: 16 } })
    : icon;
  }, []);

  // Get visible attachments
  const attachments = message.detail?.attachments || message.detail?.files || [];
  const visibleAttachments = getVisibleAttachments(attachments);

  const isImage = (attachment: E2BFile | FileItem) => {
    const contentType = (attachment as E2BFile).content_type || (attachment as FileItem).type;
    return contentType?.startsWith('image/');
  };

  const allImages = useMemo(() => {
    return (
      visibleAttachments.length > 0 &&
      visibleAttachments.every(isImage)
    );
  }, [visibleAttachments]);

  const isSingleVideo = useMemo(() => {
    if (visibleAttachments.length !== 1) return false;
    const only = visibleAttachments[0] as any;
    const contentType = (only as E2BFile).content_type || (only as FileItem).type;
    return contentType?.startsWith('video/');
  }, [visibleAttachments]);

  // Get session_id from message
  const sessionId = message.session_id || '';

  // If no attachments, return null
  if (!visibleAttachments || visibleAttachments.length === 0) {
    return null;
  }

  if (isUserMessage) {
    const images = visibleAttachments.filter(isImage);
    const files = visibleAttachments.filter((a) => !isImage(a));

    return (
      <>
        <div className="flex flex-col gap-2 w-full items-end mb-2">
          {/* Images Row */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {images.map((attachment: any) => (
                <AttachmentCard
                  key={(attachment as E2BFile).filename || (attachment as FileItem).name}
                  attachment={attachment}
                  isActive={isEqual(fileViewerFile, attachment)}
                  variant="medium"
                  siblings={images}
                />
              ))}
            </div>
          )}
          {/* Files Stack */}
          {files.length > 0 && (
            <div className="flex flex-col gap-2 items-end">
              {files.map((attachment: any) => (
                <AttachmentCard
                  key={(attachment as E2BFile).filename || (attachment as FileItem).name}
                  attachment={attachment}
                  isActive={isEqual(fileViewerFile, attachment)}
                  variant="default"
                  siblings={files}
                />
              ))}
            </div>
          )}
        </div>
        <AllFilesModal open={isModalOpen} onClose={() => setIsModalOpen(false)} sessionId={sessionId} />
      </>
    );
  }

  return (
    <>
      <div className={classNames('flex flex-wrap items-center w-full mt-2 mb-4', allImages ? 'gap-2' : 'gap-3')}>
        {/* Attachment cards */}
        {visibleAttachments.map((attachment: any, idx) => (
          <AttachmentCard
            key={(attachment as E2BFile).filename || (attachment as FileItem).name}
            attachment={attachment}
            isActive={isEqual(fileViewerFile, attachment)}
            variant={isSingleVideo || (visibleAttachments.length === 1 && allImages) ? 'xlarge' : allImages ? 'large' : 'default'}
            siblings={visibleAttachments}
          />
        ))}

        {/* "View all files" button */}
        <AllFilesModal open={isModalOpen} onClose={() => setIsModalOpen(false)} sessionId={sessionId} />
        {!allImages && message.role == 'assistant' && (
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1 p-3 bg-white border border-[#EAEAEA] rounded-xl hover:bg-[#0000000a] transition-all cursor-pointer h-[56px] w-[272px]"
          >
            <span className="w-4 h-4 text-black/30 shrink-0">
              {viewAllIcon}
            </span>
            <span className="text-[14px] w-[154px] text-[#000] truncate">
              {t('attachment.view.all')}
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default MessageAttachments;
