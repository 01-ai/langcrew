import { Attachments } from '@ant-design/x';
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import React from 'react';
import type { FileItem } from '@/types';

interface FileListProps {
  fileList: FileItem[];
  onRemove: (uid: string) => void;
}

const FileList: React.FC<FileListProps> = ({ fileList, onRemove }) => {
  return (
    <div className="flex flex-wrap gap-[12px]">
      {fileList.map((item, index) => (
        <div className="relative group" key={index}>
          {item.status === 'done' ? (
            <Attachments.FileCard item={item} />
          ) : (
            <div className="w-[68px] h-[68px] bg-black/[0.06] rounded-[6px] flex items-center justify-center">
              <LoadingOutlined />
            </div>
          )}
          <div
            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden group-hover:block p-[4px] cursor-pointer"
            onClick={() => onRemove(item.uid)}
          >
            <div className="flex items-center justify-center w-[14px] h-[14px] text-[8px] text-white bg-black/[0.5] hover:bg-black rounded-full ">
              <CloseOutlined />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileList;
