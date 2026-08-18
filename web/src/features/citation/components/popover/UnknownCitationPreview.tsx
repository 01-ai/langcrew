import React from 'react';
import type { UnknownCitationSource } from '@/types';
import { CitationSourceIcon } from '../CitationSourceIcon';
import { getCitationExcerpt, getCitationTitle, getCitationUrl } from '../../utils/citation';

interface UnknownCitationPreviewProps {
  source: UnknownCitationSource;
}

const getUnknownSubtitle = (source: UnknownCitationSource) => {
  const url = getCitationUrl(source);
  if (!url) return undefined;

  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const UnknownCitationPreview: React.FC<UnknownCitationPreviewProps> = ({ source }) => {
  const subtitle = getUnknownSubtitle(source);
  const title = getCitationTitle(source);
  const excerpt = getCitationExcerpt(source);

  return (
    <div>
      <div className="flex items-center gap-2">
        <CitationSourceIcon source={source} className="h-4 w-4 shrink-0 text-[12px]" />
        {subtitle ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="justify-start text-stone-500 text-xs font-normal leading-4">{subtitle}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-2 line-clamp-1 text-black text-sm font-semibold leading-5">{title}</div>
      {excerpt ? (
        <div className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm font-normal text-stone-500">
          {excerpt}
        </div>
      ) : null}
    </div>
  );
};

export default UnknownCitationPreview;
