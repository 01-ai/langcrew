import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { Button, Upload, UploadProps, message } from 'antd';
import React, { forwardRef, useImperativeHandle } from 'react';
import type { AntdUploadFile, FileItem } from '@/types';

import { useAgentStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import { calculateHash, generateSecureUid, getFileExtensionFromFileName } from '@/utils/file';
import http from '@/services/request';

interface FileUploadRef {
  beforeUpload?: (file: File, fileList: File[]) => Promise<boolean>;
  handleUpload?: (option: { file?: File }) => void;
}

interface FileUploadProps {
  disabled?: boolean;
  onStart: (params: FileItem) => void;
  onFinish: (params: FileItem) => void;
}

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>((props, ref) => {
  const { disabled, onStart, onFinish } = props;
  const { senderFiles, fileUploadConfig } = useAgentStore();
  const { t } = useTranslation();

  const handleUpload: UploadProps['customRequest'] = async (option) => {
    if (!fileUploadConfig.customUploadRequest || typeof fileUploadConfig.customUploadRequest !== 'function') {
      message.error('Custom upload request is not supported');
      return;
    }

    const file = option.file as AntdUploadFile;
    onStart?.({ uid: file.uid, status: 'uploading', name: '', key: '' });
    const url = await fileUploadConfig.customUploadRequest(file as File);
    if (!url) {
      message.error('Custom upload request failed');
      return;
    }

    onFinish?.({
      uid: file.uid,
      name: file.name,
      key: url,
      status: 'done',
      url: url,
      size: file.size,
      type: file.type,
    });
  };

  const beforeUpload = async (file: File, fileList: File[]) => {
    // 检查文件类型
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (fileUploadConfig.accept && !fileUploadConfig.accept.includes(fileExtension)) {
      message.error(`${t('file.upload.format.error')} ${fileUploadConfig.accept}`);
      return false;
    }

    if (fileUploadConfig.maxSize && file.size > fileUploadConfig.maxSize) {
      message.error(`${t('file.upload.size.error')} 200MB`);
      return false;
    }

    // 结合当前已有文件数量和即将上传的文件数量判断总数不能超过MAX_FILE_LIMIT个
    const currentFileCount = senderFiles?.length || 0;
    const newFileCount = fileList.length;
    const totalFileCount = currentFileCount + newFileCount;

    if (fileUploadConfig.maxCount && totalFileCount > fileUploadConfig.maxCount) {
      message.error(`${t('file.upload.count.error')} ${fileUploadConfig.maxCount}`);
      return false;
    }

    return true;
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: fileUploadConfig.accept || '',
    multiple: fileUploadConfig.multiple || false,
    maxCount: fileUploadConfig.maxCount || 1,
    showUploadList: false,
    disabled,
    beforeUpload,
    customRequest: handleUpload,
  };

  return (
    <Upload {...uploadProps}>
      <Button
        shape="circle"
        disabled={disabled}
        style={{ fontSize: '18px', width: '36px', height: '36px' }}
        icon={<CustomIcon type="link" />}
      />
    </Upload>
  );
});

export default FileUpload;
