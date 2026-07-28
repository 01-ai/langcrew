import React from 'react';
import { BriefRendererProps } from '..';
import { ToolIconCheck, ToolIconTaskError } from '@/registry/common/icons';
import { FinishReasonChunk } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

const FinishReasonBriefRenderer: React.FC<BriefRendererProps> = ({ hasUserInput, message }) => {
  const { t } = useTranslation();
  const { detail, content } = message as FinishReasonChunk;
  // Do not show if user input
  if (detail?.status === 'user_input') {
    return null;
  }
  if (hasUserInput) {
    return null;
  }

  const status = detail?.status || 'completed';
  const theme = {
    completed: {
      bgColor: '#E1FFDF',
      textColor: '#00A108',
      borderColor: '#C4FCC7',
    },
    cancelled: {
      bgColor: '#E1FFDF',
      textColor: '#00A108',
      borderColor: '#C4FCC7',
    },
    failed: {
      bgColor: '#FFEDC9',
      textColor: '#FF8800',
      borderColor: '#FF880033',
    },
    abnormal: {
      bgColor: '#FFEDC9',
      textColor: '#FF8800',
      borderColor: '#FF880033',
    },
  }[status] || {
    bgColor: '#E1FFDF',
    textColor: '#00A108',
    borderColor: '#C4FCC7',
  };

  const label = status === 'failed' && content ? content : t(`task.finish.reason.${status || 'completed'}`);

  return (
    <div
      className="w-fit flex items-center gap-[6px] px-[12px] py-[4px] rounded-[16px] border border-solid text-[14px] leading-[20px]"
      style={{
        backgroundColor: theme.bgColor,
        color: theme.textColor,
        borderColor: theme.borderColor,
      }}
    >
      {(status === 'completed' || status === 'cancelled') && <ToolIconCheck width={16} height={16} />}
      {(status === 'failed' || status === 'abnormal') && <ToolIconTaskError width={16} height={16} />}
      <span className="text-[14px] leading-[20px]">{label}</span>
    </div>
  );
};

export default FinishReasonBriefRenderer;
