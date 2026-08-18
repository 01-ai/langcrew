import React from 'react';
import type { KnowledgeCitationSource } from '@/types';
import { getCitationExcerpt, getCitationSourceName, getCitationTitle } from '../../utils/citation';
import classNames from 'classnames';
import { citationPopoverCardHoverClassName, stopCitationPopoverBubble } from './styles';
import { useOpenCitationSource } from '../../hooks/useOpenCitationSource';

interface KnowledgeCitationPreviewProps {
  source: KnowledgeCitationSource;
}

const KnowledgeCitationPreview: React.FC<KnowledgeCitationPreviewProps> = ({ source }) => {
  const openCitationSource = useOpenCitationSource();
  const title = getCitationSourceName(source) || getCitationTitle(source);
  const excerpt = getCitationExcerpt(source);

  return (
    <button
      type="button"
      aria-label={title}
      onClick={(event) => {
        stopCitationPopoverBubble(event);
        void openCitationSource(source);
      }}
      className={classNames(citationPopoverCardHoverClassName, 'w-full border-0 bg-transparent text-left')}
    >
      <div className="line-clamp-1 text-sm font-semibold leading-5 text-black">{title}</div>
      {excerpt ? (
        <div className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm font-normal text-stone-500">
          {excerpt}
        </div>
      ) : null}
    </button>
  );
};

export default KnowledgeCitationPreview;
