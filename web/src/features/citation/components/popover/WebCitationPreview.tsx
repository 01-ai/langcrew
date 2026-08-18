import React from 'react';
import type { WebCitationSource } from '@/types';
import { CitationSourceIcon } from '../CitationSourceIcon';
import { formatCitationDate, getCitationExcerpt, getCitationTitle } from '../../utils/citation';
import classNames from 'classnames';
import { citationPopoverCardHoverClassName, stopCitationPopoverBubble } from './styles';

interface WebCitationPreviewProps {
  source: WebCitationSource;
}

const WebCitationPreview: React.FC<WebCitationPreviewProps> = ({ source }) => {
  const subtitle = source.site_name;
  const displayDate = formatCitationDate(source.published_at);
  const title = getCitationTitle(source);
  const excerpt = getCitationExcerpt(source);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(citationPopoverCardHoverClassName, 'block')}
      onClick={stopCitationPopoverBubble}
      onMouseDown={stopCitationPopoverBubble}
    >
      <div className="flex items-center gap-2">
        <CitationSourceIcon source={source} className="h-4 w-4 shrink-0 text-[12px]" />
        {subtitle || displayDate ? (
          <div className="flex min-w-0 items-center gap-3">
            {subtitle ? (
              <span className="justify-start text-stone-500 text-xs font-normal leading-4">{subtitle}</span>
            ) : null}
            {displayDate ? (
              <span className="justify-start text-neutral-400 text-xs leading-4">{displayDate}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-2 line-clamp-1 text-black text-sm font-semibold leading-5">{title}</div>
      {excerpt ? (
        <div className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm font-normal text-stone-500">
          {excerpt}
        </div>
      ) : null}
    </a>
  );
};

export default WebCitationPreview;
