import React from 'react';
import { useAgentStore } from '@/store';
import { canOpenCitationSource, useOpenCitationSource } from '../hooks/useOpenCitationSource';
import { useTranslation } from '@/hooks/useTranslation';
import type { CitationSource, KnowledgeCitationSource } from '@/types';
import { groupKnowledgeCitationSourcesByKnowledgeBase } from '../utils/citation';
import CloseSvg from '@/assets/svg/citations/close.svg?react';
import WebCitationCard from './panel/WebCitationCard';
import KnowledgeCitationCard from './panel/KnowledgeCitationCard';
import MemoryCitationCard from './panel/MemoryCitationCard';
import FileCitationPreview from './popover/FileCitationPreview';

const CitationPanel = () => {
  const { citationPanelSources, closeCitationPanel } = useAgentStore();
  const openCitationSource = useOpenCitationSource();
  const { t } = useTranslation();

  if (!citationPanelSources?.length) return null;

  const sourceTypeLabels: Record<CitationSource['type'], string> = {
    web: t('citation.type.web'),
    knowledge: t('citation.type.knowledge'),
    file: t('citation.type.file'),
    memory: t('citation.type.memory'),
    unknown: t('citation.type.unknown'),
  };
  const groupedKnowledgeSources = groupKnowledgeCitationSourcesByKnowledgeBase(citationPanelSources);
  const knowledgeGroupBySourceId = new Map(
    groupedKnowledgeSources.flatMap((group) => group.sources.map((source) => [source.id, group] as const)),
  );
  const addedKnowledgeGroups = new Set<(typeof groupedKnowledgeSources)[number]>();
  const panelItems: {
    source: CitationSource;
    sources: CitationSource[];
    fragmentCount?: number;
  }[] = [];
  citationPanelSources.forEach((source) => {
    if (source.type !== 'knowledge') {
      panelItems.push({ source, sources: [source] });
      return;
    }
    const group = knowledgeGroupBySourceId.get(source.id);
    if (group && addedKnowledgeGroups.has(group)) return;
    if (group) addedKnowledgeGroups.add(group);
    panelItems.push({
      source: group?.sources[0] || source,
      sources: group?.sources || [source],
      fragmentCount: group?.fragmentCount,
    });
  });
  const panelTypeLabel = sourceTypeLabels[panelItems[0].source.type];
  const renderCitationCard = ({ source, sources, fragmentCount }: (typeof panelItems)[number]) => {
    const canOpen = canOpenCitationSource(source);
    const onOpen = () => void openCitationSource(source);

    switch (source.type) {
      case 'knowledge':
        return (
          <KnowledgeCitationCard
            key={source.id}
            source={source}
            sources={sources.filter((item): item is KnowledgeCitationSource => item.type === 'knowledge')}
            fragmentCount={fragmentCount}
          />
        );
      case 'file':
        return <FileCitationPreview key={source.id} source={source} />;
      case 'memory':
        return <MemoryCitationCard key={source.id} source={source} />;
      case 'web':
      case 'unknown':
        return <WebCitationCard key={source.id} source={source} canOpen={canOpen} onOpen={onOpen} />;
    }
  };

  return (
    <div className="h-full w-full min-w-0 bg-white">
      <div className="flex h-full w-full flex-col overflow-hidden border-l border-[#eaeaea]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#ededed] p-4">
          <div className="justify-center text-black text-lg font-normal font-['PingFang_SC'] leading-5">
            {panelTypeLabel}·{panelItems.length}
          </div>
          <button
            type="button"
            className="rounded-[4px] text-black hover:bg-[#f3f3f3] active:bg-[#ededed] cursor-pointer size-6 flex items-center justify-center"
            onClick={() => closeCitationPanel()}
            aria-label={t('citation.panel.close')}
            title={t('citation.panel.close')}
          >
            <CloseSvg className="block" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 gap-7">
          <div className="flex flex-col gap-8">{panelItems.map(renderCitationCard)}</div>
        </div>
      </div>
    </div>
  );
};

export default CitationPanel;
