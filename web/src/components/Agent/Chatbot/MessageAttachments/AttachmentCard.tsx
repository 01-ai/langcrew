import React from 'react';
import { Attachments } from '@ant-design/x';
import { EyeOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { E2BFile, FileItem } from '@/types';

// 常量定义
const ACTIVE_ICON_COLOR = 'rgb(0, 129, 242)';

// 类型定义
interface AttachmentCardProps {
  attachment: E2BFile | FileItem; // 根据实际类型调整
  isActive: boolean;
  onSelect: (attachment: any) => void;
}

// 工具函数
const transformAttachmentToFileCard = (attachment: E2BFile | FileItem) => ({
  uid: (attachment as E2BFile).filename || (attachment as FileItem).name,
  name: (attachment as E2BFile).filename || (attachment as FileItem).name,
  type: (attachment as E2BFile).content_type || (attachment as FileItem).type,
  fileName: (attachment as E2BFile).filename || (attachment as FileItem).name,
  size: attachment.size,
  url: attachment.url,
});

// 子组件：附件覆盖层（眼睛图标）
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

// 附件卡片组件
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
