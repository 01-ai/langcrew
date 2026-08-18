import React from 'react';
import type { UnknownCitationSource, WebCitationSource } from '@/types';
import { CitationSourceIcon } from '../CitationSourceIcon';
import classNames from 'classnames';
import { formatCitationDate, getCitationExcerpt, getCitationTitle } from '../../utils/citation';

interface WebCitationCardProps {
  source: WebCitationSource | UnknownCitationSource;
  canOpen: boolean;
  onOpen: () => void;
}

const WebCitationCard: React.FC<WebCitationCardProps> = ({ source, canOpen, onOpen }) => {
  const publishedAt = source.type === 'web' ? formatCitationDate(source.published_at) : undefined;
  const siteName = source.type === 'web' ? source.site_name : undefined;
  const title = getCitationTitle(source);
  const excerpt = getCitationExcerpt(source);

  return (
    <div className="flex min-w-0 flex-col">
      <button
        type="button"
        className={classNames(
          'w-full border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-[#1677ff]',
          {
            'cursor-pointer': canOpen,
            'cursor-default': !canOpen,
          },
        )}
        disabled={!canOpen}
        onClick={onOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CitationSourceIcon source={source} className="h-5 w-5 shrink-0 text-base [&>svg]:size-4" />
          <div className="inline-flex justify-start items-center gap-3">
            {siteName ? <div className="justify-start text-stone-500 text-xs leading-4">{siteName}</div> : null}
            {publishedAt ? <div className="justify-start text-neutral-400 text-xs leading-4">{publishedAt}</div> : null}
          </div>
        </span>
        <div className="text-black text-sm font-semibold leading-5 line-clamp-1 mt-2">{title}</div>
      </button>

      {excerpt ? <div className="text-stone-500 text-sm leading-5 line-clamp-2 mt-1">{excerpt}</div> : null}
    </div>
  );
};

export default WebCitationCard;
