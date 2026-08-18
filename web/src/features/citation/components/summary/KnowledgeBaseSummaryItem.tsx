import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import classNames from 'classnames';
import { citationPopoverCardHoverClassName, stopCitationPopoverBubble } from '../popover/styles';
import type { KnowledgeBaseCitationGroup } from '../../utils/citation';
import type { CitationSource } from '@/types';

interface KnowledgeBaseSummaryItemProps {
  group: KnowledgeBaseCitationGroup;
  onOpen: (sources: CitationSource[]) => void;
}

const KnowledgeBaseSummaryItem: React.FC<KnowledgeBaseSummaryItemProps> = ({ group, onOpen }) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      aria-label={group.knowledgeName}
      onClick={(event) => {
        stopCitationPopoverBubble(event);
        onOpen(group.sources);
      }}
      className={classNames(
        citationPopoverCardHoverClassName,
        'flex w-full flex-col gap-0.5 border-0 bg-transparent text-left',
      )}
    >
      <div className="line-clamp-1 text-sm font-semibold leading-5 text-black">{group.knowledgeName}</div>
      <div className="text-xs leading-4 text-neutral-400">
        {t('citation.fragments', { count: group.fragmentCount })}
      </div>
    </button>
  );
};

export default KnowledgeBaseSummaryItem;
