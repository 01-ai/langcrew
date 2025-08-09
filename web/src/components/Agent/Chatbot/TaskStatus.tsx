import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { MobileOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { CheckSvg } from '@/assets/svg';
import { useAgentStore } from '@/store';
import { TaskStage } from '@/types';

const TaskStatus: React.FC = () => {
  const { taskStage } = useAgentStore();
  const { t } = useTranslation();

  if (taskStage === TaskStage.Hitl) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-[#FFEDC9] text-[#FF8800] rounded-full  py-1.5  px-3 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                strokeWidth="2"
                stroke="#FF9500"
                strokeDasharray="2 2"
                style={{ transformOrigin: 'center' }}
              />
            </svg>

            <span>{t('chatbot.task.hilt.operate')}</span>
            <div className="bg-white border border-[#EAEAEA] rounded-full px-3 py-1 flex items-center gap-1">
              <MobileOutlined style={{ color: '#456CFF' }} />
              <span className="text-[#999999]">{t('chatbot.task.hilt.cloud.phone')}</span>
            </div>
          </div>

          <ArrowRightOutlined style={{ color: '#FF8800' }} />
        </div>

        <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-[#EDEDED] shadow-[0px_2px_8px_0px_rgba(0,_0,_0,_0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                <rect x="8" y="10" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" fill="none" />
                <rect x="10" y="12" width="4" height="1" rx="0.5" fill="currentColor" />
              </svg>
            </div>

            <div className="flex items-center gap-2 text-base font-medium">
              <span>{t('chatbot.task.hilt.operate.finish')}</span>
              <div className="bg-white border border-[#EAEAEA] rounded-full px-3 py-1 flex items-center gap-1">
                <MobileOutlined style={{ color: '#456CFF' }} />
                <span className="text-[#999999]">{t('chatbot.task.hilt.cloud.phone')}</span>
              </div>
              <span>{',' + t('chatbot.task.hilt.continue')}</span>
            </div>
          </div>

          <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">继续</button>
        </div>
      </div>
    );
  }

  if (taskStage === TaskStage.Success) {
    return (
      <div className="inline-flex items-center py-1 px-3 gap-1 text-[#00A108] bg-[#D5FFD2] rounded-full">
        <CheckSvg />
        {t('chatbot.task.success')}
      </div>
    );
  }

  if (taskStage === TaskStage.Failure) {
    return (
      <div className="inline-flex items-center py-1 px-3 gap-1 text-[#FF0000] bg-[#FFE5E5] rounded-full">
        {t('chatbot.task.fail')}
      </div>
    );
  }

  return null;
};

export default TaskStatus;
