import React from 'react';
import { E2BFile, FileItem, MessageChunk } from '@/types';
import { useAgentStore } from '@/store';
import AttachmentCard from './AttachmentCard';
import { getVisibleAttachments, hasAttachments } from './utils';

interface MessageAttachmentsProps {
  message: MessageChunk;
}

const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ message }) => {
  const { setFileViewerFile, fileViewerFile } = useAgentStore();

  const attachments = message.detail?.attachments || message.detail?.files;

  const visibleAttachments = getVisibleAttachments(attachments);

  if (!visibleAttachments || visibleAttachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleAttachments.map((attachment) => (
        <AttachmentCard
          key={(attachment as E2BFile).filename || (attachment as FileItem).name}
          attachment={attachment}
          isActive={fileViewerFile === attachment}
          onSelect={setFileViewerFile}
        />
      ))}
    </div>
  );
};

export default MessageAttachments;
