import { Sender } from '@ant-design/x';
import { Button, Flex, Tooltip } from 'antd';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import useChat from '@/hooks/useChat';

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
  } = useAgentStore();

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
    });
    setSenderContent('');
  }, [send, senderContent, senderLoading, setSenderContent]);

  const handleCancel = useCallback(() => {
    stop();
    setSenderStopping(true);
  }, [stop, setSenderStopping]);

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
        footer={({ components }) => {
          const { SendButton } = components;
          return (
            <Flex justify="space-between" align="center">
              <div></div>
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
