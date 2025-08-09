import React from 'react';
import { ToolIconCircle, ToolIconPhone, ToolIconArrow, ToolIconPhone2 } from './icons';
import eventBus from '@/utils/eventBus';
import { useTranslation } from '@/hooks/useTranslation';

const PhoneHIL = ({ userInputable = true }: { userInputable?: boolean }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex justify-between items-center bg-[#FFEDC9] rounded-2xl px-3 py-1.5 text-[#FF8800]">
        <div className="flex flex-row items-center gap-1">
          <ToolIconCircle />
          <div className="text-[14px]">{t('task.phone.continue.text1')}</div>
          <div className="flex items-center bg-white rounded-[11px] px-2 py-1 gap-0.5">
            <ToolIconPhone className="text-[#456CFF] text-[14px]" />
            <div className="text-[#999999] text-[12px] leading-[12px]">{t('task.phone.continue.title')}</div>
          </div>
          <div>{t('task.phone.continue.text2')}</div>
        </div>
        <div>
          <ToolIconArrow />
        </div>
      </div>
      <div className="flex flex-row items-center justify-between gap-1 rounded-[12px] border-[#EDEDED] border-[1px] p-2 pl-4">
        <div className="flex flex-row items-center gap-3">
          <ToolIconPhone2 className="text-[28px]" />
          <div className="flex items-center gap-1">
            <div>{t('task.phone.continue.text3')}</div>
            <div className="flex items-center bg-white rounded-[14px] p-1.5 gap-0.5 border-[#EAEAEA] border-[1px]">
              <ToolIconPhone className="text-[#456CFF] text-[16px]" />
              <div className="text-black text-[14px] leading-[16px]">{t('task.phone.continue.title')}</div>
            </div>
            <div>{t('task.phone.continue.text4')}</div>
          </div>
        </div>
        <div
          className={`px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${
            userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'
          }
        `}
          onClick={() => {
            if (userInputable) {
              eventBus.emit('user_input_click', t('task.user_input.continue.button'));
            }
          }}
        >
          {t('task.user_input.continue.button')}
        </div>
      </div>
    </>
  );
};

export default PhoneHIL;
