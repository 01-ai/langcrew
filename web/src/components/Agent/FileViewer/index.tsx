import React from 'react';
import { Button } from 'antd';
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store';
import FileReader from '@/components/Infra/FileReader';
import { E2BFile, FileItem } from '@/types';

const FileViewer = () => {
  const { fileViewerFile, setFileViewerFile } = useAgentStore();

  const fileViewerRenderer = () => {
    return (
      <FileReader
        key={fileViewerFile.url} // 避免URL变化时，content更新慢
        url={fileViewerFile.url}
        contentType={(fileViewerFile as E2BFile).content_type || (fileViewerFile as FileItem).type}
        filename={(fileViewerFile as E2BFile)?.filename || (fileViewerFile as FileItem)?.name}
      />
    );
  };

  const handleFileViewerClose = () => {
    setFileViewerFile(undefined);
  };

  const renderTitle = () => {
    return (fileViewerFile as E2BFile)?.filename || (fileViewerFile as FileItem)?.name;
  };

  const handleDownloadFile = async () => {
    const url = fileViewerFile.url;
    const filename = (fileViewerFile as E2BFile)?.filename || (fileViewerFile as FileItem)?.name;
    const contentType = (fileViewerFile as E2BFile).content_type || (fileViewerFile as FileItem).type;

    // 检查是否为图片类型
    const isImage = contentType && contentType.startsWith('image/');

    if (isImage) {
      try {
        // 对于图片，先获取blob数据再下载
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 清理blob URL
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Failed to download the image:', error);
        // 如果fetch失败，回退到原始方法
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      }
    } else {
      // 对于非图片文件，使用原始方法
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    }
  };

  if (!fileViewerFile) {
    return null;
  }

  return (
    <div className="min-w-[45%] max-w-[45%] flex flex-col h-full bg-white border-l border-[#e9e9e9]">
      <div className="p-4 gap-4 flex items-center justify-between flex-shrink-0 border-b border-[#e9e9e9]">
        <div className="flex-1">{renderTitle()}</div>
        <Button type="text" icon={<DownloadOutlined />} onClick={handleDownloadFile} />
        <Button type="text" icon={<CloseOutlined />} onClick={handleFileViewerClose} />
      </div>
      <div className="flex-1 overflow-auto p-5">
        <div className="w-full h-full overflow-hidden">{fileViewerRenderer()}</div>
      </div>
    </div>
  );
};

export default FileViewer;
