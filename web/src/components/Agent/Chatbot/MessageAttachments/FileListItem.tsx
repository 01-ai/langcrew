import React from 'react';
import { Checkbox, Button, Dropdown } from 'antd';
import { FileCard } from '@ant-design/x';
import { EllipsisOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { E2BFile } from '@/types';
import { formatSize } from '@/utils/fileHelpers';
import { transformAttachmentToFileCard } from '@/utils/file';
import DownloadIcon from '@/assets/svg/messageAttachments/download.svg?react';
import { useTranslation } from '@/hooks/useTranslation';

interface FileListItemProps {
  file: E2BFile;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (path: string) => void;
  onPreview: (file: E2BFile) => void;
  onDownload: (file: E2BFile) => void;
}

export const FileListItem: React.FC<FileListItemProps> = ({
  file,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownload,
}) => {
  const { t } = useTranslation();
  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect(file.path);
    } else {
      onPreview(file);
    }
  };

  return (
    <div
      className="flex items-center justify-between py-4  pl-0 hover:bg-gray-50 border-b border-[#F2F2F2] group transition-all cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Checkbox in selection mode */}
        {isSelectionMode && (
          <Checkbox checked={isSelected} className="font-medium text-gray-600 text-[15px] square-checkbox " />
        )}

        {/* FileCard icon */}
        <FileCard
          {...transformAttachmentToFileCard(file)}
          imageProps={{ preview: false }}
          styles={{
            root: {
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
            },
            file: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
            },
            icon: {
              fontSize: 32,
              margin: 0,
            },
            name: {
              display: 'none', // Hide the name inside FileCard
            },
            description: {
              display: 'none', // Hide the description inside FileCard
            },
          }}
          classNames={{
            file: 'p-0',
          }}
        />

        {/* File name and info */}
        <div className="flex-1 truncate">
          <div className="text-[14px] h-5 leading-5 text-[#000] truncate">{file.filename}</div>
          <div className="text-[12px] h-3 leading-3 text-[#000] opacity-30 truncate">{formatSize(file.size)}</div>
        </div>
      </div>

      {/* Action menu in normal mode */}
      {!isSelectionMode && (
        <Dropdown
          menu={{
            className: 'min-w-[120px] h-[90px] p-4 rounded-[16px] border border-[#EAEAEA] custom-dropdown-items',
            items: [
              {
                key: '1',
                label: t('file.preview'),
                style: {
                  padding: '0',
                  margin: '0',
                  height: '20px',
                },
                icon: <EyeOutlined className="text-xl mr-2" />,
                onClick: (e) => {
                  e.domEvent.stopPropagation();
                  onPreview(file);
                },
              },
              {
                key: '2',
                label: t('attachment.download'),
                style: {
                  padding: '0',
                  margin: '16px 0 0 0',
                  height: '20px',
                },
                icon: <DownloadIcon className="text-xl w-5 h-5" />,
                onClick: (e) => {
                  e.domEvent.stopPropagation();
                  onDownload(file);
                },
              },
            ],
          }}
          trigger={['click']}
        >
          <Button
            type="text"
            icon={<EllipsisOutlined className="!text-black text-lg" />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      )}
    </div>
  );
};
