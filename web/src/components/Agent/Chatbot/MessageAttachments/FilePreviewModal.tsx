import React from 'react';
import { Modal, Button } from 'antd';
import { E2BFile } from '@/types';
import { FileReader } from '@/components/Infra';
import { FileViewerCloseIcon, FileViewerDownloadPngIcon } from '@/components/Infra/Icons';
import { downloadAttachment } from '@/utils/file';

interface FilePreviewModalProps {
  file: E2BFile | null;
  open: boolean;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, open, onClose }) => {
  if (!file) return null;

  return (
    <Modal
      title={
        <div className="pb-4 gap-4 flex items-center justify-between flex-shrink-0 border-b border-[#e9e9e9]">
          <div className="flex-1">{file.filename}</div>
          <Button
            type="text"
            icon={<FileViewerDownloadPngIcon style={{ width: 24, height: 24 }} />}
            onClick={() => downloadAttachment(file)}
          />
          <Button type="text" icon={<FileViewerCloseIcon style={{ fontSize: 16 }} />} onClick={onClose} />
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      height={600}
      closable={false}
    >
      <div className="w-full h-[600px]">
        <FileReader key={file.url} url={file.url} contentType={file.content_type} filename={file.filename} />
      </div>
    </Modal>
  );
};

