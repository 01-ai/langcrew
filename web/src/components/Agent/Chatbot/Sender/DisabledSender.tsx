import { Button, ConfigProvider } from 'antd';
import React from 'react';
import NewChatIcon from '@/assets/svg/sender/new-chat.svg?react';
import { useTranslation } from '@/hooks/useTranslation';

interface DisabledSenderProps {
  onNewChat: () => void;
}

const DisabledSender = ({ onNewChat }: DisabledSenderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center w-full h-14 pl-5 pr-3 py-2.5 relative bg-gradient-to-r from-[#F6F6F8] to-white rounded-[28px] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)] outline outline-1 outline-offset-[-1px] outline-gray-200">
      <div className="flex justify-start items-center">
        <div className="color-black text-sm font-normal leading-4">{t('sender.disabled.message')}</div>
      </div>
      <ConfigProvider
        theme={{
          components: {
            Button: {
              // Button gradient from #333 to #222
              colorPrimary: '#333333',
              colorPrimaryHover: '#222222',
              colorPrimaryActive: '#111111',
              // Text color
              colorText: '#ffffff',
              colorTextLightSolid: '#ffffff',
              // Border
              colorBorder: '#000000',
              colorPrimaryBorder: '#000000',
              lineWidth: 1,
              // Radius
              borderRadius: 18,
              // Font
              fontSize: 14,
              lineHeight: 1.43,
              fontWeight: 500,
              // Size
              controlHeight: 36,
              paddingContentHorizontal: 16,
              // Shadow
              defaultShadow: 'inset 0px -1.5px 1px 0px #000000, inset 0px 1.5px 1px 0px rgba(255, 255, 255, 0.3)',
              primaryShadow: 'inset 0px -1.5px 1px 0px #000000, inset 0px 1.5px 1px 0px rgba(255, 255, 255, 0.3)',
            },
          },
        }}
      >
        <Button type="primary" icon={<NewChatIcon />} onClick={onNewChat}>
          {t('sender.disabled.new_chat')}
        </Button>
      </ConfigProvider>
    </div>
  );
};

export default DisabledSender;
