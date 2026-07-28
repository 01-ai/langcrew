import { useCallback } from 'react';
import type { FileItem } from '@/types';

interface FileUploadRef {
  beforeUpload?: (file: File, fileList: File[]) => Promise<boolean>;
  handleUpload?: (option: { file?: File }) => void | Promise<void>;
}

interface UseSenderFileHandlersProps {
  fileUploadDisabled?: boolean;
  fileUploadRef: React.RefObject<FileUploadRef>;
  senderFiles: FileItem[];
  senderFilesConfig: {
    onRemove?: (file?: FileItem) => void;
  };
  setSenderFiles: (files: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
}

export const useSenderFileHandlers = ({
  fileUploadDisabled,
  fileUploadRef,
  senderFiles,
  senderFilesConfig,
  setSenderFiles,
}: UseSenderFileHandlersProps) => {
  const handlePaste = useCallback(
    async (files: FileList | File[]) => {
      if (fileUploadDisabled) return;

      const uploader = fileUploadRef.current;
      if (!uploader) return;

      try {
        const fileArray = Array.from(files);
        const verifiedFiles: File[] = [];

        for (const file of fileArray) {
          const verified = await uploader.beforeUpload?.(file, fileArray);
          if (verified) {
            verifiedFiles.push(file);
          }
        }

        const uploadPromises = verifiedFiles.map((file) => uploader.handleUpload?.({ file }));
        await Promise.all(uploadPromises);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    },
    [fileUploadDisabled, fileUploadRef],
  );

  const handleRemoveFile = useCallback(
    (uid: string) => {
      if (senderFilesConfig.onRemove) {
        senderFilesConfig.onRemove(senderFiles.filter((item) => item.uid === uid)[0]);
      }

      setSenderFiles((prev: FileItem[]) => prev.filter((item) => item.uid !== uid));
    },
    [setSenderFiles, senderFilesConfig, senderFiles],
  );

  const handleFileStartUpload = useCallback(
    (params: FileItem) => {
      setSenderFiles((prev: FileItem[]) => [...prev, params]);
    },
    [setSenderFiles],
  );

  const handleFileFinishUpload = useCallback(
    (params: FileItem) => {
      setSenderFiles((prev: FileItem[]) => {
        const index = prev.findIndex((item) => item.uid === params.uid);
        if (index === -1) return prev;
        if (params.status === 'error') return prev.filter((item) => item.uid !== params.uid);

        const next = [...prev];
        next[index] = params;
        return next;
      });
    },
    [setSenderFiles],
  );

  return {
    handlePaste,
    handleRemoveFile,
    handleFileStartUpload,
    handleFileFinishUpload,
  };
};
