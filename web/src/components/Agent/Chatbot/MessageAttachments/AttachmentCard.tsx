import React from 'react';
import { Attachments } from '@ant-design/x';
import { EyeOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { E2BFile, FileItem } from '@/types';

// constant definition
const ACTIVE_ICON_COLOR = 'rgb(0, 129, 242)';

// type definition
interface AttachmentCardProps {
  attachment: E2BFile | FileItem; // adjust according to actual type
  isActive: boolean;
  onSelect: (attachment: any) => void;
}

// utility function
const transformAttachmentToFileCard = (attachment: E2BFile | FileItem) => ({
  uid: (attachment as E2BFile).filename || (attachment as FileItem).name,
  name: (attachment as E2BFile).filename || (attachment as FileItem).name,
  type: (attachment as E2BFile).content_type || (attachment as FileItem).type,
  fileName: (attachment as E2BFile).filename || (attachment as FileItem).name,
  size: attachment.size,
  url: attachment.url,
});

// subcomponent: attachment overlay (eye icon)
const AttachmentOverlay: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <div
    className={classNames(
      'absolute top-0 left-0 w-full h-full flex items-center justify-end px-3 pointer-events-none',
      {
        'opacity-0 group-hover:opacity-100': !isActive,
        'opacity-100': isActive,
      },
    )}
  >
    <div className="border border-[#EDEDED] rounded-[4px] p-1 w-[24px] h-[24px] flex items-center justify-center">
      <EyeOutlined
        style={{
          color: isActive ? ACTIVE_ICON_COLOR : 'inherit',
        }}
      />
    </div>
  </div>
);

// attachment card component
const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment, isActive, onSelect }) => {
  const handleClick = () => onSelect(attachment);

  const isImage =
    (attachment as E2BFile).content_type?.startsWith('image/') || (attachment as FileItem).type?.startsWith('image/');

  return (
    <div className="cursor-pointer relative group" onClick={handleClick}>
      <Attachments.FileCard item={transformAttachmentToFileCard(attachment)} imageProps={{ preview: false }} />
      {!isImage && <AttachmentOverlay isActive={isActive} />}
    </div>
  );
};

export default AttachmentCard;
