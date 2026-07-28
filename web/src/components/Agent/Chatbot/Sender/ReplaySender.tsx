import { StepForwardOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Space } from 'antd';
import React, { useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import useReplay from '@/hooks/useReplay';
import RestartIcon from '@/assets/svg/sender/restart.svg?react';
import './index.less';

const SenderContainer: React.FC = () => {
  const { shareId, sharePassword } = useAgentStore();
  const { t } = useTranslation();

  const { isPlaying, start, end, loaded } = useReplay(shareId.slice(2), shareId.startsWith('e-'), sharePassword);

  // Process to End
  const handleJumpToEnd = useCallback(() => {
    end();
  }, [end]);

  // Start processing the head start
  const handleRestart = useCallback(() => {
    start();
  }, [start]);

  return (
    <div className="flex justify-between items-center w-full h-14 pl-5 pr-3 py-2.5 relative bg-gradient-to-r from-[#F6F6F8] to-white rounded-[28px] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)] outline outline-1 outline-offset-[-1px] outline-gray-200">
      <div className="flex justify-start items-center color-black text-sm font-normal leading-4">
        {isPlaying ? t('task.replay.replaying') : loaded ? t('task.replay.finished') : ''}
      </div>
      <Space>
        <ConfigProvider
          theme={{
            components: {
              Button: {
                // Button Gradient Background Color (from #333 Present. #222）
                colorPrimary: '#333333 !important',
                colorPrimaryHover: '#222222 !important',
                colorPrimaryActive: '#111111 !important',
                // Text Colour
                colorText: '#ffffff !important',
                colorTextLightSolid: '#ffffff !important',
                // Border
                colorBorder: '#000000 !important',
                colorPrimaryBorder: '#000000 !important',
                lineWidth: 1,
                // Round corner
                borderRadius: 18,
                // Fonts
                fontSize: 14,
                lineHeight: 1.43,
                fontWeight: 500,
                // Dimensions
                controlHeight: 36,
                paddingContentHorizontal: 16,
                // Shadow Effects
                defaultShadow: 'inset 0 -1.5px 1px #000, inset 0 1.5px 1px #ffffff1e',
                primaryShadow: 'inset 0 -1.5px 1px #000, inset 0 1.5px 1px #ffffff1e',
              },
            },
          }}
        >
          {isPlaying ? (
            <Button
              shape="round"
              color="default"
              variant="solid"
              icon={<StepForwardOutlined />}
              onClick={handleJumpToEnd}
              className="agentx-replay-button"
            >
              {t('sender.replay.end')}
            </Button>
          ) : (
            <Button
              shape="round"
              color="primary"
              variant="solid"
              icon={<RestartIcon />}
              onClick={handleRestart}
              className="agentx-replay-button"
            >
              {t('sender.replay.restart')}
            </Button>
          )}
        </ConfigProvider>
      </Space>
    </div>
  );
};

export default SenderContainer;
