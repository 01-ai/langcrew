import { Sender } from '@ant-design/x';
import { Badge, Button, Flex, Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import useChat from '@/hooks/useChat';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import { FileItem } from '@/types';

const MAX_CONTENT_LENGTH = 3000;

const SenderContainer: React.FC = () => {
  const { t } = useTranslation();

  const {
    sessionInfo,
    senderLoading,
    senderContent,
    setSenderContent,
    senderStopping,
    setSenderStopping,
    senderSending,
    fileUploadConfig,
    senderFiles,
    setSenderFiles,
  } = useAgentStore();
  const headerOpen = useMemo(() => senderFiles.length > 0, [senderFiles]);

  const sessionActive = useMemo(() => {
    return sessionInfo?.status !== 'ARCHIVED';
  }, [sessionInfo?.status]);

  const { send, stop } = useChat();

  const handleSend = useCallback(() => {
    if (senderContent.length === 0 || senderContent.length > MAX_CONTENT_LENGTH || senderLoading) {
      return;
    }
    send({
      content: senderContent,
      files: senderFiles,
    });
    setSenderContent('');
    // 清空文件列表
    useAgentStore.setState({ senderFiles: [] });
  }, [send, senderContent, senderLoading, setSenderContent, senderFiles]);

  const handleCancel = useCallback(() => {
    stop();
    setSenderStopping(true);
  }, [stop, setSenderStopping]);

  const handleFileStartUpload = useCallback(
    (params: FileItem) => {
      setSenderFiles((pre: FileItem[]) => [...pre, ...[params]]);
    },
    [setSenderFiles],
  );

  const handleFileFinishUpload = useCallback(
    (params: FileItem) => {
      console.log('handleFileFinishUpload', params);
      setSenderFiles((pre: FileItem[]) => {
        const index = pre.findIndex((item: FileItem) => item.uid === params.uid);
        if (index !== -1) {
          if (params.status === 'error') {
            // 上传失败，移除该文件
            return pre.filter((item: FileItem) => item.uid !== params.uid);
          } else {
            // 上传成功，更新该文件信息
            const newPre = [...pre];
            newPre[index] = params;
            return newPre;
          }
        }
        return pre;
      });
    },
    [setSenderFiles],
  );

  const handleRemoveFile = useCallback(
    (uid: string) => {
      setSenderFiles((pre: FileItem[]) => pre.filter((item: FileItem) => item.uid !== uid));
    },
    [setSenderFiles],
  );

  const headerNode = (
    <Sender.Header title={false} closable={false} open={headerOpen}>
      <FileList fileList={senderFiles} onRemove={handleRemoveFile} />
    </Sender.Header>
  );

  return (
    <div className="agentx-sender w-full bg-white rounded-[24px]">
      <Sender
        value={senderContent}
        disabled={!sessionActive}
        autoSize={{ minRows: 2, maxRows: 3 }}
        placeholder={t('sender.placeholder')}
        onChange={setSenderContent}
        onSubmit={handleSend}
        actions={false}
        header={headerNode}
        footer={({ components }) => {
          const { SendButton } = components;
          return (
            <Flex justify="space-between" align="center">
              <div>
                {fileUploadConfig.customUploadRequest && (
                  <Badge dot={senderFiles?.length > 0 && !headerOpen}>
                    <FileUpload
                      disabled={!sessionActive || senderFiles.length >= fileUploadConfig.maxCount}
                      onStart={handleFileStartUpload}
                      onFinish={handleFileFinishUpload}
                    />
                  </Badge>
                )}
              </div>
              <Flex align="center" gap={12}>
                {senderSending ? (
                  <Tooltip title="Stop">
                    <Button
                      type="primary"
                      shape="circle"
                      style={{ width: '36px', height: '36px' }}
                      onClick={handleCancel}
                      loading={senderStopping}
                    >
                      {!senderStopping && <div className="w-[14px] h-[14px] bg-white rounded-[4px]"></div>}
                    </Button>
                  </Tooltip>
                ) : (
                  <SendButton
                    type="primary"
                    disabled={!sessionActive || senderContent.length > MAX_CONTENT_LENGTH || senderLoading}
                    style={{ width: '36px', height: '36px', fontSize: '18px' }}
                  />
                )}
              </Flex>
            </Flex>
          );
        }}
      />
    </div>
  );
};

export default SenderContainer;
