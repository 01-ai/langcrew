import React, { useState, useEffect } from 'react';
import { BriefRendererProps } from '..';
import { Markdown } from '@/components/Infra';
import ExpandCollapseIcon from '@/assets/svg/planner-expand.svg?react';
import { useTranslation } from '@/hooks/useTranslation';

const ReasoningBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastLine, setLastLine] = useState('');

  // Take the last line
  useEffect(() => {
    const lines = message.content?.split('\n').filter((line) => line.trim());
    if (lines.length > 0) {
      setLastLine(lines[lines.length - 1]);
    }
  }, [message.content]);

  // Hide when content is empty
  if (!message.content || message.content?.trim() === '') {
    return null;
  }

  return (
    <div className="bg-gray-100 hover:bg-gray-200 rounded-lg my-1 transition-colors w-full min-w-0 overflow-hidden max-w-[640px]">
      <div
        className="flex items-center justify-between cursor-pointer w-full min-w-0 px-2 py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 ">
          <span className="text-gray-600 text-sm font-medium shrink-0">{t('reasoning.thinking')}</span>
          {!isExpanded && lastLine && <span className="text-gray-500 text-xs truncate min-w-0">{lastLine}</span>}
        </div>
        <div className="w-3 h-3 flex items-center justify-center shrink-0">
          <ExpandCollapseIcon
            aria-hidden
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
      {isExpanded && (
        <div className="mt-2 px-2 pb-2 max-w-full min-w-0 overflow-x-auto">
          <Markdown content={message.content} className="max-w-full min-w-0" />
        </div>
      )}
    </div>
  );
};

export default ReasoningBriefRenderer;
