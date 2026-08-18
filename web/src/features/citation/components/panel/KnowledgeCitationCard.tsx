import React from 'react';
import type { KnowledgeCitationSource } from '@/types';
import { CitationSourceIcon } from '../CitationSourceIcon';
import {
  formatCitationDate,
  getCitationExcerpt,
  getCitationSourceName,
  getCitationTimestamp,
  getCitationTitle,
} from '../../utils/citation';
import { useTranslation } from '@/hooks/useTranslation';
import { Markdown } from '@/components/Infra';
import { Tooltip } from 'antd';

interface KnowledgeCitationCardProps {
  source: KnowledgeCitationSource;
  sources: KnowledgeCitationSource[];
  fragmentCount?: number;
}

const KnowledgeCitationCard: React.FC<KnowledgeCitationCardProps> = ({
  source,
  sources,
  fragmentCount,
}) => {
  const { t } = useTranslation();
  const sourceName = getCitationSourceName(source);
  const date = formatCitationDate(getCitationTimestamp(source));
  const metadata = [sourceName, date].filter(Boolean).join(' · ');
  const excerpts = sources
    .map((item) => ({
      id: item.id,
      content: getCitationExcerpt(item),
    }))
    .filter((item): item is { id: string; content: string } => Boolean(item.content));

  return (
    <div className="flex min-w-0 flex-col">
      <span className="flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-1">
          <CitationSourceIcon source={source} className="size-4 shrink-0" />
          <span className="truncate text-black text-sm font-semibold leading-5">{getCitationTitle(source)}</span>
        </span>
        {fragmentCount !== undefined ? (
          <span className="shrink-0 text-neutral-400 text-xs font-normal leading-4">
            {t('citation.fragments', { count: fragmentCount })}
          </span>
        ) : null}
      </span>
      {metadata ? (
        <span className="mt-1 block truncate text-sm font-normal leading-5 text-neutral-500">{metadata}</span>
      ) : null}

      {excerpts.length ? (
        <div className="mt-3 flex flex-col gap-2">
          {excerpts.map((excerpt) => (
            <div key={excerpt.id} className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-black">
              <Markdown content={excerpt.content} className="line-clamp-3" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default KnowledgeCitationCard;
