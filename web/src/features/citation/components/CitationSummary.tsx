import React from 'react';
import { Popover } from 'antd';
import type {
  CitationSource,
  FileCitationSource,
  MemoryCitationSource,
  UnknownCitationSource,
  WebCitationSource,
} from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { groupKnowledgeCitationSourcesByKnowledgeBase } from '../utils/citation';
import { getCitationTypeIcon } from './CitationSourceIcon';
import CitationSummaryPreviewLayout from './summary/CitationSummaryPreviewLayout';
import KnowledgeBaseSummaryItem from './summary/KnowledgeBaseSummaryItem';
import WebCitationPreview from './popover/WebCitationPreview';
import FileCitationPreview from './popover/FileCitationPreview';
import MemoryCitationPreview from './popover/MemoryCitationPreview';
import UnknownCitationPreview from './popover/UnknownCitationPreview';

interface CitationSummaryProps {
  sources: CitationSource[];
  onOpen: (sources: CitationSource[]) => void;
}

const renderTypePreview = (
  type: CitationSource['type'],
  label: string,
  sources: CitationSource[],
  onOpen: (sources: CitationSource[]) => void,
) => {
  switch (type) {
    case 'web':
      return (
        <CitationSummaryPreviewLayout type={type} label={label}>
          {sources
            .filter((source): source is WebCitationSource => source.type === 'web')
            .map((source) => (
              <WebCitationPreview key={source.id} source={source} />
            ))}
        </CitationSummaryPreviewLayout>
      );
    case 'knowledge':
      return (
        <CitationSummaryPreviewLayout type={type} label={label}>
          {groupKnowledgeCitationSourcesByKnowledgeBase(sources).map((group) => (
            <KnowledgeBaseSummaryItem key={`${group.source}:${group.knowledgeId}`} group={group} onOpen={onOpen} />
          ))}
        </CitationSummaryPreviewLayout>
      );
    case 'file':
      return (
        <CitationSummaryPreviewLayout type={type} label={label}>
          {sources
            .filter((source): source is FileCitationSource => source.type === 'file')
            .map((source) => (
              <FileCitationPreview key={source.id} source={source} />
            ))}
        </CitationSummaryPreviewLayout>
      );
    case 'memory':
      return (
        <CitationSummaryPreviewLayout type={type} label={label}>
          {sources
            .filter((source): source is MemoryCitationSource => source.type === 'memory')
            .map((source) => (
              <MemoryCitationPreview key={source.id} source={source} />
            ))}
        </CitationSummaryPreviewLayout>
      );
    case 'unknown':
      return (
        <CitationSummaryPreviewLayout type={type} label={label}>
          {sources
            .filter((source): source is UnknownCitationSource => source.type === 'unknown')
            .map((source) => (
              <UnknownCitationPreview key={source.id} source={source} />
            ))}
        </CitationSummaryPreviewLayout>
      );
  }
};

const CitationSummary: React.FC<CitationSummaryProps> = ({ sources, onOpen }) => {
  const { t } = useTranslation();

  if (sources.length === 0) return null;

  const counts = sources.reduce<Record<CitationSource['type'], number>>(
    (result, source) => {
      result[source.type] += 1;
      return result;
    },
    { web: 0, knowledge: 0, file: 0, memory: 0, unknown: 0 },
  );
  counts.knowledge = groupKnowledgeCitationSourcesByKnowledgeBase(sources).length;
  const groups: {
    type: CitationSource['type'];
    label: string;
  }[] = [
    {
      type: 'web',
      label: t('citation.summary.web', { count: counts.web }),
    },
    {
      type: 'knowledge',
      label: t('citation.summary.knowledge', { count: counts.knowledge }),
    },
    {
      type: 'file',
      label: t('citation.summary.file', { count: counts.file }),
    },
    {
      type: 'memory',
      label: t('citation.summary.memory', { count: counts.memory }),
    },
    {
      type: 'unknown',
      label: t('citation.summary.unknown', { count: counts.unknown }),
    },
  ];

  return (
    <>
      <div className="text-center justify-start text-stone-500 text-sm font-normal leading-5 ml-4 mr-2">
        {t('citation.summary')}
      </div>

      {groups
        .filter(({ type }) => counts[type] > 0)
        .map(({ type, label }) => {
          const typeSources = sources.filter((source) => source.type === type);

          return (
            <Popover
              key={type}
              content={renderTypePreview(type, label, typeSources, onOpen)}
              placement="bottomLeft"
              trigger={['hover', 'focus']}
              mouseEnterDelay={0.15}
              arrow={false}
              classNames={{
                container: 'pt-3 pb-2 px-2 rounded-[16px]',
              }}
            >
              <button
                type="button"
                className="hover:bg-[#F1F1F1] pl-1 pr-2 py-1 rounded-sm flex justify-start items-center gap-1 overflow-hidden cursor-pointer border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1677ff]"
                onClick={() => onOpen(typeSources)}
              >
                <div className="size-4 flex items-center justify-center">{getCitationTypeIcon(type)}</div>
                <div className="justify-start text-stone-500 text-xs font-normal font-['PingFang_SC'] leading-4">
                  {label}
                </div>
              </button>
            </Popover>
          );
        })}
    </>
  );
};

export default CitationSummary;
