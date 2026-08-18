import { E2BFile, FileItem } from '@/types';
import { FileCardProps } from '@ant-design/x';
import MdIcon from '@/assets/svg/fileicons/md.svg?react';
import React from 'react';
import FileIcon from '@/assets/svg/fileviewer/file-icon.svg?react';
import PdfIcon from '@/assets/svg/fileicons/pdf.svg?react';
import PptIcon from '@/assets/svg/fileicons/ppt.svg?react';
import DocIcon from '@/assets/svg/fileicons/doc.svg?react';
import HtmlIcon from '@/assets/svg/fileicons/html.svg?react';
import CsvIcon from '@/assets/svg/fileicons/csv.svg?react';
import ExcelIcon from '@/assets/svg/fileicons/excel.svg?react';
import TxtIcon from '@/assets/svg/fileicons/txt.svg?react';
import VideoIcon from '@/assets/svg/fileicons/video.svg?react';

export const calculateHash = (
  chunkList: {
    chunk: Blob;
  }[],
): Promise<string> => {
  return new Promise((resolve) => {
    const worker: Worker = new Worker('/hashWorker.js');
    worker.postMessage({ chunkList: chunkList });
    worker.onmessage = (e) => {
      const { hash } = e.data;
      if (hash) {
        resolve(hash);
      }
    };
  });
};

const CHUNK_SIZE = 1 * 1024 * 1024;

// Split the file
export const splitFile = (file: File, size = CHUNK_SIZE) => {
  const fileChunkList = [];
  let curChunkIndex = 0;
  while (curChunkIndex <= file.size) {
    const chunk = file.slice(curChunkIndex, curChunkIndex + size);
    fileChunkList.push({ chunk: chunk });
    curChunkIndex += size;
  }
  return fileChunkList;
};

/**
 * Generate a unique id
 * Format: chat-uid-{timestamp-base36}-{random}
 * @param prefix Optional prefix, default 'chat-uid'
 * @returns Unique id string
 */
const generateUid = (prefix: string = 'chat-uid'): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${randomStr}`;
};

/**
 * Safer uid via modern browser APIs (fallback)
 * @param prefix Optional prefix, default 'chat-uid'
 * @returns Unique id string
 */
export const generateSecureUid = (prefix: string = 'chat-uid'): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // Fall back to the original approach
  return generateUid(prefix);
};

/**
 * Get the dotted file extension
 * @param filename File name
 * @returns Extension with dot (e.g. ".txt"), or empty string
 */
export function getFileExtensionFromFileName(filename: string): string {
  if (!filename || filename.indexOf('.') === -1) {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');

  // Handle hidden files like ".gitignore"
  if (lastDotIndex === 0) {
    return filename;
  }

  // Handle names like "file."
  if (lastDotIndex === filename.length - 1) {
    return '';
  }

  return filename.slice(lastDotIndex);
}

/**
 * Allowed upload types
 */
export const ALLOWED_FILES = [
  // Document formats
  '.pdf', '.doc', '.docx', '.txt', '.md', '.log',
  // Spreadsheet formats
  '.xls', '.xlsx', '.csv',
  // Presentation formats
  '.ppt', '.pptx',
  // Image formats
  '.jpg', '.jpeg', '.png',
  // Audio formats
  '.mp3', '.wav', '.m4a',
  // Video formats
  '.mp4',
  // Code formats
  '.py', '.js', '.java', '.json', '.yml', '.yaml',
  // Archive formats
  '.zip', '.rar', '.7z', '.tar', '.gz'
].join(',');

/**
 * Allowed-type description (for errors)
 */
export const ALLOWED_FILES_DESC = ALLOWED_FILES.replace(/\./g, '').split(',').join('/');

/**
 * Whether the file may be uploaded
 * @param filename File name
 * @returns Whether upload is allowed
 */
export const isFileAllowed = (filename: string): boolean => {
  const ext = getFileExtensionFromFileName(filename).toLowerCase();
  if (!ext) return false;
  return ALLOWED_FILES.split(',').includes(ext);
};

export const mergeFiles = (existingFiles: FileItem[], newFiles?: FileItem[]) => {
  if (!newFiles?.length) {
    return existingFiles;
  }

  // When newFiles is set, drop .pptx from existingFiles
  const filteredExisting = existingFiles.filter((file) => !file.name.toLowerCase().endsWith('.pptx'));
  const mergedFiles = [...filteredExisting, ...newFiles];
  return mergedFiles;
};

export const downloadAttachment = async (attachment: E2BFile | FileItem) => {
  const url = attachment.url;
  const filename = (attachment as E2BFile)?.filename || (attachment as FileItem)?.name;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke the blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Failed to download the image:', error);
    // If fetch fails, fall back to the original method
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
};

export const transformContentTypeToFileCard = (contentType: string) => {
  if (contentType.startsWith('image/')) {
    return 'image';
  } else if (contentType.startsWith('video/')) {
    return 'video';
  } else if (contentType.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
};

export const getFileIcon = (filename: string) => {
  const lowerFilename = (filename || '').toLowerCase();

  if (lowerFilename.endsWith('.md') || lowerFilename.endsWith('.markdown')) {
    return <MdIcon />;
  }
  if (lowerFilename.endsWith('.pdf')) {
    return <PdfIcon />;
  }
  if (lowerFilename.endsWith('.ppt') || lowerFilename.endsWith('.pptx')) {
    return <PptIcon />;
  }
  if (lowerFilename.endsWith('.doc') || lowerFilename.endsWith('.docx')) {
    return <DocIcon />;
  }
  if (lowerFilename.endsWith('.html') || lowerFilename.endsWith('.htm')) {
    return <HtmlIcon />;
  }
  if (lowerFilename.endsWith('.csv')) {
    return <CsvIcon />;
  }
  if (lowerFilename.endsWith('.xlsx') || lowerFilename.endsWith('.xls')) {
    return <ExcelIcon />;
  }
  if (
    lowerFilename.endsWith('.txt') ||
    lowerFilename.endsWith('.log') ||
    lowerFilename.endsWith('.py') ||
    lowerFilename.endsWith('.js') ||
    lowerFilename.endsWith('.java') ||
    lowerFilename.endsWith('.json') ||
    lowerFilename.endsWith('.yml') ||
    lowerFilename.endsWith('.yaml')
  ) {
    return <TxtIcon />;
  }
  if (
    lowerFilename.endsWith('.mp4') ||
    lowerFilename.endsWith('.mov') ||
    lowerFilename.endsWith('.mkv') ||
    lowerFilename.endsWith('.avi') ||
    lowerFilename.endsWith('.webm') ||
    lowerFilename.endsWith('.m4v') ||
    lowerFilename.endsWith('.mp3') ||
    lowerFilename.endsWith('.wav') ||
    lowerFilename.endsWith('.m4a')
  ) {
    return <VideoIcon />;
  }

  return <FileIcon />;
};

export const transformAttachmentToFileCard = (attachment: E2BFile | FileItem) => {
  const type = transformContentTypeToFileCard((attachment as E2BFile).content_type || (attachment as FileItem).type);

  return {
    name: (attachment as E2BFile).filename || (attachment as FileItem).name,
    byte: (attachment as E2BFile).size || (attachment as FileItem).size,
    type,
    src: (attachment as E2BFile).url || (attachment as FileItem).url,
    ...(type === 'image' && {
      styles: {
        file: {
          width: 68,
          height: 68,
        },
      },
    }),
    icon: getFileIcon((attachment as E2BFile).filename || (attachment as FileItem).name),
  } as FileCardProps;
};
