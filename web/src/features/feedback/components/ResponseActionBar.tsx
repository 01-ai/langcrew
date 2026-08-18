import React from 'react';
import { CitationSummary } from '@/features/citation';
import { useAgentStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import MessageBrief from '@/registry/common/MessageBrief';
import type { CitationSource, MessageChunk, MessageItem } from '@/types';
import FeedbackButtons from './FeedbackButtons';
import { shouldShowFeedback } from '../utils';

interface ResponseActionBarProps {
  message: MessageItem;
  hasUserInput: boolean;
  finishReasonMsg?: MessageChunk;
  showFinishReason: boolean;
  citationSources: CitationSource[];
  showCitationSummary: boolean;
  traceUrl?: string;
}

const ResponseActionBar: React.FC<ResponseActionBarProps> = ({
  message,
  hasUserInput,
  finishReasonMsg,
  showFinishReason,
  citationSources,
  showCitationSummary,
  traceUrl,
}) => {
  const { t } = useTranslation();
  const { mode, shareId, sessionConfig, openCitationPanel } = useAgentStore();
  const showFeedback = shouldShowFeedback(message, {
    enableFeedback: sessionConfig.enableFeedback,
    mode,
    shareId,
    hasUserInput,
  });
  const showTrace = Boolean(traceUrl && showFinishReason);

  if (!showFinishReason && !showFeedback && !showCitationSummary && !showTrace) {
    return null;
  }

  const showSeparator = (showFinishReason || showFeedback) && showCitationSummary;

  return (
    <div className="flex w-fit max-w-full flex-wrap items-center gap-y-2">
      {showFinishReason && finishReasonMsg ? (
        <MessageBrief message={finishReasonMsg} hasUserInput={hasUserInput} />
      ) : null}
      {showFeedback ? <FeedbackButtons responseId={message.responseId} /> : null}
      {showSeparator ? <span className="ml-4 h-5 w-px shrink-0 bg-[#d9d9d9]" aria-hidden="true" /> : null}
      {showCitationSummary ? <CitationSummary sources={citationSources} onOpen={openCitationPanel} /> : null}
      {showTrace && traceUrl ? (
        <a
          href={traceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[14px] leading-[22px] text-[#999] hover:text-[#666] ml-4"
        >
          {t('chatbot.view_trace')} <span className="text-[#bbb]">{'>'}</span>
        </a>
      ) : null}
    </div>
  );
};

export default ResponseActionBar;
