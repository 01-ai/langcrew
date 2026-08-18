import React, { Children, useEffect, useState } from 'react';
import { Popover } from 'antd';
import type { CitationSource } from '@/types';
import { CitationSourceIcon } from '@/features/citation/components/CitationSourceIcon';
import { CitationSourcePreview } from '@/features/citation/components/CitationSourcePreview';
import {
  getCitationTitle,
  groupCitationSourcesByType,
  normalizeCitationId,
  parseCitationIds,
} from '@/features/citation/utils/citation';

interface CitationElementProps {
  citations?: CitationSource[];
  children?: React.ReactNode;
  onOpen?: (source: CitationSource | CitationSource[]) => void;
}

interface CitationTypePillProps {
  sources: CitationSource[];
  resolvedCitations: CitationSource[];
  onOpen?: (source: CitationSource | CitationSource[]) => void;
}

const getChildrenText = (children: React.ReactNode) =>
  Children.toArray(children)
    .filter((child): child is string | number => typeof child === 'string' || typeof child === 'number')
    .join('');

const getCitationPillTitle = (source: CitationSource) =>
  source.type === 'web' ? source.site_name || getCitationTitle(source) : getCitationTitle(source);

const CitationTypePill: React.FC<CitationTypePillProps> = ({ sources, resolvedCitations, onOpen }) => {
  const sourcesKey = sources.map((source) => source.id).join(',');
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSource = sources[activeIndex] || sources[0];
  const firstSource = sources[0];
  const title = firstSource ? getCitationPillTitle(firstSource) : '';
  const openTarget = firstSource?.type === 'knowledge' ? sources : activeSource;
  const canOpen = Boolean(
    onOpen &&
    openTarget &&
    firstSource?.type !== 'unknown' &&
    sources.some((source) =>
      resolvedCitations.some((citation) => normalizeCitationId(citation.id) === normalizeCitationId(source.id)),
    ),
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [sourcesKey]);

  if (!firstSource) return null;

  return (
    <Popover
      content={
        <CitationSourcePreview sources={sources} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} />
      }
      placement="bottomLeft"
      trigger={['hover', 'focus']}
      mouseEnterDelay={0.15}
      onOpenChange={(open) => open && setActiveIndex(0)}
      arrow={false}
      classNames={{
        container: 'p-2 rounded-[16px]',
      }}
    >
      <span className="citation-pill max-w-[120px] ">
        <button
          type="button"
          className="citation-pill__button"
          disabled={!canOpen}
          aria-label={title}
          onClick={() => {
            if (!canOpen || !openTarget) return;
            onOpen?.(openTarget);
          }}
        >
          <CitationSourceIcon source={firstSource} className="citation-pill__icon size-3 text-[12px]" />
          <span className="citation-pill__title truncate">{title}</span>
          {sources.length > 1 && <span className="text-stone-500 text-[10px] leading-3">+{sources.length - 1}</span>}
        </button>
      </span>
    </Popover>
  );
};

const CitationElement: React.FC<CitationElementProps> = ({ citations = [], children, onOpen }) => {
  const citationIds = parseCitationIds(getChildrenText(children));
  const sources: CitationSource[] = citationIds.map((citationId): CitationSource => {
    const resolvedSource = citations.find((source) => normalizeCitationId(source.id) === citationId);
    return (
      resolvedSource || {
        id: citationId,
        type: 'unknown' as const,
        title: citationId,
      }
    );
  });
  const typeGroups = groupCitationSourcesByType(sources);

  if (typeGroups.length === 0) return null;

  return (
    <>
      {typeGroups.map(({ type, sources: groupSources }) => (
        <CitationTypePill key={type} sources={groupSources} resolvedCitations={citations} onOpen={onOpen} />
      ))}
    </>
  );
};

export default CitationElement;
