import { CaretRightOutlined, StepForwardOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import React, { useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import useReplay from '@/hooks/useReplay';

const SenderContainer: React.FC = () => {
  const { shareId, sharePassword } = useAgentStore();
  const { t } = useTranslation();

  const { isPlaying, start, end, loaded } = useReplay(shareId.slice(2), shareId.startsWith('e-'), sharePassword);

  // 处理跳到结束
  const handleJumpToEnd = useCallback(() => {
    end();
  }, [end]);

  // 处理重头开始
  const handleRestart = useCallback(() => {
    start();
  }, [start]);

  return (
    <div className="flex items-center gap-6 bg-white rounded-xl py-3 px-4 w-full border border-[#d9d9d9] shadow-[0_1px_2px_0_rgba(0,_0,_0,_0.03),_0_1px_6px_-1px_rgba(0,_0,_0,_0.02),_0_2px_4px_0_rgba(0,_0,_0,_0.02)]">
      <div className="flex-1 flex items-center gap-2">
        {isPlaying ? t('task.replay.replaying') : loaded ? t('task.replay.finished') : ''}
      </div>
      <Space>
        {isPlaying ? (
          <Button
            shape="round"
            color="default"
            variant="solid"
            icon={<StepForwardOutlined />}
            onClick={handleJumpToEnd}
            disabled={!loaded}
          >
            {t('sender.replay.end')}
          </Button>
        ) : (
          <Button
            shape="round"
            color="primary"
            variant="solid"
            icon={<CaretRightOutlined />}
            onClick={handleRestart}
            disabled={!loaded}
          >
            {t('sender.replay.restart')}
          </Button>
        )}
      </Space>
    </div>
  );
};

export default SenderContainer;
