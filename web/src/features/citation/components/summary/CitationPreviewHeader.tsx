import React from 'react';
import type { CitationSourceType } from '@/types';
import { getCitationTypeIcon } from '../CitationSourceIcon';

interface CitationPreviewHeaderProps {
  type: CitationSourceType;
  label: string;
}

const CitationPreviewHeader: React.FC<CitationPreviewHeaderProps> = ({ type, label }) => (
  <div className="flex items-center gap-1">
    <span className="flex size-4 items-center justify-center" aria-hidden="true">
      {getCitationTypeIcon(type)}
    </span>
    <span className="text-stone-500 text-xs leading-4">{label}</span>
  </div>
);

export default CitationPreviewHeader;
