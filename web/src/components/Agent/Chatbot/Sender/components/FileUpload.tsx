import { calculateHash, splitFile, generateSecureUid } from '@/utils/file';
import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { Button, Upload, UploadProps, message } from 'antd';
import React from 'react';
import type { AntdUploadFile, FileItem } from '@/types';
import { fileApi } from '@/services/api';
import { useAgentStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import { uploadFileUrl } from '@/utils/file';

interface FileUploadProps {
  disabled?: boolean;
  onStart: (params: FileItem) => void;
  onFinish: (params: FileItem) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ disabled, onStart, onFinish }) => {
  const { senderFiles } = useAgentStore();
  const { t } = useTranslation();

  const handleUpload = async (option: any) => {
    const uid = generateSecureUid();
    onStart?.({ uid: uid, status: 'uploading', name: '', key: '' });

    try {
      const file = option.file as AntdUploadFile;
      const chunkList = splitFile(file as unknown as File);
      const md5 = await calculateHash(chunkList);

      // 使用新的 API 服务获取预签名 URL
      const presignedResponse = await fileApi.getPresignedUrl(md5);
      const data = presignedResponse.data;

      // const url = 'https://console-boe.lingyiwanwu.net/tobg-chatpdf'; // data.url;
      const url = uploadFileUrl(data.url);
      const formData = new FormData();

      Object.entries(data.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file as unknown as File);

      // 使用新的 API 服务上传文件
      await fileApi.upload(url, formData);

      const fileUrl = `${url}/${data.fields.key}`;

      onFinish?.({
        uid,
        name: file.name,
        key: data.fields.key,
        status: 'done',
        url: fileUrl,
        size: file.size,
        type: file.type,
      });
    } catch (error) {
      onFinish?.({ uid, status: 'error', name: '', key: '' });
      console.error('Error uploading file:', error);
    }
  };

  const beforeUpload = (file: File, fileList: File[]) => {
    const maxSize = 200 * 1024 * 1024; // 200MB
    const allowedTypes = [
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.docx',
      '.xlsx',
      '.pptx',
      '.pdf',
      '.md',
      '.txt',
      '.html',
      '.htm',
      '.xml',
      '.csv',
    ];

    // 检查文件类型
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(fileExtension)) {
      message.error(`${t('file.upload.format.error')} ${allowedTypes.join(', ')}`);
      return false;
    }

    if (file.size > maxSize) {
      message.error(`${t('file.upload.size.error')} 200MB`);
      return false;
    }

    // 结合当前已有文件数量和即将上传的文件数量判断总数不能超过6个
    const currentFileCount = senderFiles?.length || 0;
    const newFileCount = fileList.length;
    const totalFileCount = currentFileCount + newFileCount;

    if (totalFileCount > 6) {
      message.error(`${t('file.upload.count.error')} 6`);
      return false;
    }

    return true;
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.pdf,.md,.txt,.html,.htm,.xml,.csv',
    multiple: true,
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
};

export default FileUpload;
