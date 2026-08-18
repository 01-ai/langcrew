import React from 'react';
import type { CitationSource, KnowledgeCitationSource } from '@/types';
import LeftIcon from '@/assets/svg/citations/left.svg?react';
import RightIcon from '@/assets/svg/citations/right.svg?react';
import WebCitationPreview from './popover/WebCitationPreview';
import KnowledgeCitationPreview from './popover/KnowledgeCitationPreview';
import FileCitationPreview from './popover/FileCitationPreview';
import MemoryCitationPreview from './popover/MemoryCitationPreview';
import UnknownCitationPreview from './popover/UnknownCitationPreview';
import { stopCitationPopoverBubble } from './popover/styles';

interface CitationSourcePreviewProps {
  sources: CitationSource[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

const renderSourcePreview = (source: CitationSource) => {
  switch (source.type) {
    case 'web':
      return <WebCitationPreview source={source} />;
    case 'knowledge':
      return <KnowledgeCitationPreview source={source} />;
    case 'file':
      return <FileCitationPreview source={source} />;
    case 'memory':
      return <MemoryCitationPreview source={source} />;
    case 'unknown':
      return <UnknownCitationPreview source={source} />;
  }
};

export const CitationSourcePreview: React.FC<CitationSourcePreviewProps> = ({
  sources,
  activeIndex,
  onActiveIndexChange,
}) => {
  const source = sources[activeIndex] || sources[0];
  if (!source) return null;

  const knowledgeSources = sources.filter(
    (item): item is KnowledgeCitationSource => item.type === 'knowledge',
  );
  const isKnowledgeList = source.type === 'knowledge';
  const hasMultipleSources = sources.length > 1;
  const isFirstSource = activeIndex <= 0;
  const isLastSource = activeIndex >= sources.length - 1;

  const move = (offset: number) => {
    const nextIndex = Math.max(0, Math.min(activeIndex + offset, sources.length - 1));
    if (nextIndex !== activeIndex) {
      onActiveIndexChange(nextIndex);
    }
  };

  return (
    <div
      className="flex max-h-[50vh] w-[336px] flex-col overflow-hidden"
      onClick={stopCitationPopoverBubble}
      onMouseDown={stopCitationPopoverBubble}
    >
      {!isKnowledgeList && hasMultipleSources ? (
        <div className="p-2 mb-1 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded text-[#595959] hover:bg-[#f2f2f2] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent"
              disabled={isFirstSource}
              onClick={() => move(-1)}
              aria-label="Previous source"
            >
              <LeftIcon />
            </button>
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded text-[#595959] hover:bg-[#f2f2f2] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent"
              disabled={isLastSource}
              onClick={() => move(1)}
              aria-label="Next source"
            >
              <RightIcon />
            </button>
          </div>
          <span className="text-xs leading-4 text-neutral-400">
            {activeIndex + 1}/{sources.length}
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isKnowledgeList ? (
          <div className="flex flex-col gap-2">
            {knowledgeSources.map((knowledgeSource) => (
              <KnowledgeCitationPreview key={knowledgeSource.id} source={knowledgeSource} />
            ))}
          </div>
        ) : (
          renderSourcePreview(source)
        )}
      </div>
    </div>
  );
};
