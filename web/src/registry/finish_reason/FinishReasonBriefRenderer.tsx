import React from 'react';
import { BriefRendererProps } from '..';
import { ToolIconCheck, ToolIconTaskError } from '@/registry/common/icons';
import { FinishReasonChunk } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

const FinishReasonBriefRenderer: React.FC<BriefRendererProps> = ({ hasUserInput, message }) => {
  const { t } = useTranslation();
  const { detail } = message as FinishReasonChunk;
  // if it is the user input, do not show
  if (detail?.status === 'user_input') {
    return null;
  }
  if (hasUserInput) {
    return null;
  }

  const bgColor = {
    completed: '#D5FFD2',
    cancelled: '#D5FFD2',
    failed: '#FFEDC9',
    abnormal: '#FFEDC9',
  }[detail?.status || 'completed'];

  const textColor = {
    completed: '#00A108',
    cancelled: '#00A108',
    failed: '#FF8800',
    abnormal: '#FF8800',
  }[detail?.status || 'completed'];

  return (
    <div
      className={`rounded-[14px] w-fit px-3 py-1 flex items-center gap-1`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {(detail?.status === 'completed' || detail?.status === 'cancelled') && <ToolIconCheck />}
      {(detail?.status === 'failed' || detail?.status === 'abnormal') && <ToolIconTaskError />}
      {t(`task.finish.reason.${detail?.status || 'completed'}`)}
    </div>
  );
};

export default FinishReasonBriefRenderer;
