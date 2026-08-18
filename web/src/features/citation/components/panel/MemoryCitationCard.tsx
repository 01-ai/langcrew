import React from 'react';
import type { MemoryCitationSource } from '@/types';
import { CitationSourceIcon } from '../CitationSourceIcon';
import {
  getCitationExcerpt,
  getCitationTitle,
} from '../../utils/citation';

interface MemoryCitationCardProps {
  source: MemoryCitationSource;
}

const MemoryCitationCard: React.FC<MemoryCitationCardProps> = ({ source }) => {
  const excerpt = getCitationExcerpt(source);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex min-w-0 items-center gap-2">
        <CitationSourceIcon
          source={source}
          className="h-5 w-5 shrink-0 text-base [&>svg]:size-4"
        />
        <span className="truncate text-base font-semibold leading-6 text-black">
          {getCitationTitle(source)}
        </span>
      </div>

      {excerpt ? (
        <div className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-[#f7f7f7] px-5 py-4 text-base font-normal leading-6 text-black">
          {excerpt}
        </div>
      ) : null}
    </div>
  );
};

export default MemoryCitationCard;
