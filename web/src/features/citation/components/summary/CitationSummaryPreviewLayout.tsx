import React from 'react';
import type { CitationSourceType } from '@/types';
import CitationPreviewHeader from './CitationPreviewHeader';
import { stopCitationPopoverBubble } from '../popover/styles';

interface CitationSummaryPreviewLayoutProps {
  type: CitationSourceType;
  label: string;
  children: React.ReactNode;
}

const CitationSummaryPreviewLayout: React.FC<CitationSummaryPreviewLayoutProps> = ({ type, label, children }) => (
  <div
    className="flex max-h-[50vh] w-[336px] flex-col gap-3 overflow-hidden"
    onClick={stopCitationPopoverBubble}
    onMouseDown={stopCitationPopoverBubble}
  >
    <div className="shrink-0 px-2">
      <CitationPreviewHeader type={type} label={label} />
    </div>
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">{children}</div>
  </div>
);

export default CitationSummaryPreviewLayout;
