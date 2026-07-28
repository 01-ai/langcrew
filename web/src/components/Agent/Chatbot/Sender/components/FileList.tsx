import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import type { FileItem } from '@/types';
import { getFileIcon } from '@/utils/file';

interface FileListProps {
  fileList: FileItem[];
  onRemove: (uid: string) => void;
}

const formatFileSize = (size: number) => {
  if (size === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FileItemComponent: React.FC<{ item: FileItem; onRemove: (uid: string) => void }> = ({
  item,
  onRemove,
}) => {
  const isImage = item.type?.startsWith('image/');
  const [imgSrc, setImgSrc] = useState<string | undefined>(item.url);

  useEffect(() => {
    if (item.url) {
      setImgSrc(item.url);
    } else if (item.originFileObj && isImage) {
      const url = URL.createObjectURL(item.originFileObj);
      setImgSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [item.url, item.originFileObj, isImage]);

  if (isImage) {
    return (
      <div className="agentx-file-item">
        <div className="agentx-file-thumbnail">
          {imgSrc ? (
            <img src={imgSrc} alt={item.name} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/[0.04]">
              <LoadingOutlined />
            </div>
          )}
          {item.status === 'uploading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <LoadingOutlined className="text-white" />
            </div>
          )}
        </div>
        <div className="agentx-file-close" onClick={() => onRemove(item.uid)}>
          <CloseOutlined />
        </div>
      </div>
    );
  }

  return (
    <div className="agentx-file-item">
      <div className="agentx-file-card">
        <div className="agentx-file-icon">
          {item.status === 'uploading' ? <LoadingOutlined /> : getFileIcon(item.name)}
        </div>
        <div className="agentx-file-info">
          <div className="agentx-file-name" title={item.name}>
            {item.name || (item.status === 'uploading' ? 'Uploading...' : '')}
          </div>
          <div className="agentx-file-size">{formatFileSize(item.size || 0)}</div>
        </div>
      </div>
      <div className="agentx-file-close" onClick={() => onRemove(item.uid)}>
        <CloseOutlined />
      </div>
    </div>
  );
};

const FileList: React.FC<FileListProps> = ({ fileList, onRemove }) => {
  return (
    <div className="agentx-file-list">
      {fileList?.map((item, index) => (
        <FileItemComponent item={item} onRemove={onRemove} key={item.uid || index} />
      ))}
    </div>
  );
};

export default FileList;
