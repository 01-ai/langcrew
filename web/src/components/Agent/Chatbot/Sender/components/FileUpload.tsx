import {
  calculateHash,
  splitFile,
  generateSecureUid,
  getFileExtensionFromFileName,
  ALLOWED_FILES,
  ALLOWED_FILES_DESC,
  isFileAllowed,
} from '@/utils/file';
import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { Button, Upload, UploadProps, message } from 'antd';
import React, { forwardRef, useImperativeHandle } from 'react';
import type { AntdUploadFile, FileItem } from '@/types';
import { useAgentStore, useRequestClient } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';

interface FileUploadRef {
  beforeUpload?: (file: File, fileList: File[]) => Promise<boolean>;
  handleUpload?: (option: { file?: File }) => void;
}

interface FileUploadProps {
  disabled?: boolean;
  onStart: (params: FileItem) => void;
  onFinish: (params: FileItem) => void;
}

const MAX_FILE_LIMIT = 10;

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>((props, ref) => {
  const { disabled, onStart, onFinish } = props;
  const { senderFiles, senderFilesConfig } = useAgentStore();
  const requestClient = useRequestClient();
  const { t } = useTranslation();

  const effectiveMaxCount = senderFilesConfig.maxLength && senderFilesConfig.maxLength !== Infinity 
    ? senderFilesConfig.maxLength 
    : MAX_FILE_LIMIT;

  const handleUpload = async (option: any) => {
    const file = option.file as AntdUploadFile;
    const uid = generateSecureUid();
    onStart?.({
      uid: uid,
      status: 'uploading',
      name: file.name,
      key: '',
      type: file.type,
      size: file.size,
      originFileObj: file as unknown as File,
    });

    try {
      const chunkList = splitFile(file as unknown as File);
      const md5 = await calculateHash(chunkList);

      // Use new API Service Get Pre-Signation URL
      const presignedResponse = await requestClient.file.getPresignedUrl(
        md5 + getFileExtensionFromFileName(file.name),
      );
      const data = presignedResponse.data;

      const url = data.url;
      const formData = new FormData();

      Object.entries(data.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file as unknown as File);

      // Use new API Service Uploading File
      await requestClient.file.upload(url, formData);

      const fileUrl = `${url.replace(/\/+$/, '')}/${data.fields.key.replace(/^\/+/, '')}`;

      onFinish?.({
        uid,
        name: file.name,
        key: data.fields.key,
        status: 'done',
        url: fileUrl,
        size: file.size,
        type: file.type,
        originFileObj: file as unknown as File,
      });
    } catch (error) {
      onFinish?.({ uid, status: 'error', name: '', key: '' });
      console.error('Error uploading file:', error);
    }
  };

  const beforeUpload = async (file: File, fileList: File[]) => {
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (file.size > maxSize) {
      message.error(`${t('file.upload.size.error')} 100MB`);
      return false;
    }

    // 2026-05-21：Remove File Type Limit
    // Validate the file type.
    // if (!isFileAllowed(file.name)) {
    //   message.error(`${t('file.upload.format.error')} ${ALLOWED_FILES_DESC}`);
    //   return false;
    // }

    // The total number of files that are currently available and are about to be uploaded cannot be exceeded effectiveMaxCount individual
    const currentFileCount = senderFiles?.length || 0;
    const newFileCount = fileList.length;
    const totalFileCount = currentFileCount + newFileCount;

    if (totalFileCount > effectiveMaxCount) {
      const isFirstFile = fileList.indexOf(file) === 0;
      if (isFirstFile) {
        // Only popup error alarm box when first file is shown to avoid repeated displays
        message.error(`${t('file.upload.count.error')} ${effectiveMaxCount}`);
      }
      return false;
    }
    if (senderFilesConfig.beforeUpload && !senderFilesConfig.beforeUpload(fileList, file)) {
      return false;
    }

    return true;
  };

  useImperativeHandle(ref, () => ({
    beforeUpload,
    handleUpload,
  }));

  const uploadProps: UploadProps = {
    name: 'file',
    // 2026-05-21：Remove File Type Limit
    // accept: senderFilesConfig.accept || ALLOWED_FILES,
    multiple: senderFilesConfig.maxLength ? senderFilesConfig.maxLength > 1 : true,
    showUploadList: false,
    disabled,
    beforeUpload,
    customRequest: handleUpload,
  };

  return (
    <Upload {...uploadProps}>
      {senderFilesConfig.Button ? (
        <senderFilesConfig.Button disabled={disabled} />
      ) : (
        <Button
          shape="circle"
          disabled={disabled}
          style={{ fontSize: '18px', width: '36px', height: '36px' }}
          icon={<CustomIcon type="link" />}
        />
      )}
    </Upload>
  );
});

export default FileUpload;
