import React from 'react';
import { BriefRendererProps } from '..';
import { ToolIconCheck, ToolIconTaskError } from '@/registry/common/icons';
import { FinishReasonChunk } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

const FinishReasonBriefRenderer: React.FC<BriefRendererProps> = ({ hasUserInput, message }) => {
  const { t } = useTranslation();
  const { detail, content } = message as FinishReasonChunk;
  // Hide when the user has input
  if (detail?.status === 'user_input') {
    return null;
  }
  if (hasUserInput) {
    return null;
  }

  const status = detail?.status === 'success' ? 'completed' : detail?.status || 'completed';
  const textColor =
    {
      completed: '#00B42A',
      cancelled: '#00B42A',
      failed: '#FF8800',
      abnormal: '#FF8800',
    }[status] || '#00B42A';

  const label = status === 'failed' && content ? content : t(`task.finish.reason.${status || 'completed'}`);

  return (
    <div className="flex w-fit items-center gap-1.5 text-[14px] font-medium leading-[22px]" style={{ color: textColor }}>
      {(status === 'completed' || status === 'cancelled') && <ToolIconCheck width={16} height={16} />}
      {(status === 'failed' || status === 'abnormal') && <ToolIconTaskError width={16} height={16} />}
      <span>{label}</span>
    </div>
  );
};

export default FinishReasonBriefRenderer;
