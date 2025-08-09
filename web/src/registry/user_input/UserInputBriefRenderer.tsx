import React from 'react';
import { ToolBriefRendererProps } from '..';
import { Alert } from 'antd';
import { Markdown } from '@/components/Infra';
import { useTranslation } from '@/hooks/useTranslation';
import { UserInputChunk } from '@/types';
import eventBus from '@/utils/eventBus';
import { ToolIconCircle } from '../common/icons';
import PhoneHIL from '../common/PhoneHIL';
import useHumanInTheLoop from '../common/useHumanInTheLoop';

const UserInputBriefRenderer: React.FC<ToolBriefRendererProps> = ({ message }) => {
  const { t } = useTranslation();

  const userInputMessage = message as UserInputChunk;

  const { showTakeOverBrowser, showTakeOverPhone, showOptionContainer, userInputable } =
    useHumanInTheLoop(userInputMessage);

  const handleClick = (option: string) => {
    if (userInputable) {
      eventBus.emit('user_input_click', option);
    }
  };

  const renderUserInput = () => {
    // 如果需要接管浏览器，则显示接管浏览器按钮
    if (showTakeOverBrowser) {
      return (
        <div className="flex gap-2 items-center justify-between p-2 pl-4 rounded-xl border border-[#ededed]">
          <Markdown content={userInputMessage.content} />
          <div className="flex items-center gap-2">
            <a
              href={userInputMessage.detail?.interrupt_data?.intervention_info?.intervention_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (!userInputable) {
                  e.preventDefault();
                  return;
                }
              }}
              className={`px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${
                userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'
              }`}
            >
              {t('task.user_input.take_over_browser.button')}
            </a>
          </div>
        </div>
      );
    }
    // 如果需要接管手机，则显示接管手机按钮
    if (showTakeOverPhone) {
      return <PhoneHIL userInputable={userInputable} />;
    }
    // 如果有选项，则显示选项
    if (showOptionContainer) {
      return (
        <div className="flex gap-2 items-center justify-between p-2 pl-4 rounded-xl border border-[#ededed]">
          <Markdown content={userInputMessage.content} />
          <div className="flex items-center gap-2">
            {userInputMessage?.detail?.options?.map((option) => (
              <div
                key={option}
                className={`px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${
                  userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'
                }
                  `}
                onClick={() => {
                  handleClick(option);
                }}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      );
    }
    // 否则显示内容
    return <Markdown content={message.content} />;
  };

  return (
    <>
      {renderUserInput()}

      <div className="py-1.5 px-3 rounded-2xl flex items-center gap-1 bg-[#FFEDC9] text-[14px] w-fit text-[#E07801]">
        <ToolIconCircle />
        <div>{t('user.input.brief')}</div>
      </div>
    </>
  );
  return <Alert message={<Markdown content={message.content} />} type="warning" />;
};

export default UserInputBriefRenderer;
