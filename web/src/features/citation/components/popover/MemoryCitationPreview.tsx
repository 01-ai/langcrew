import React from 'react';
import type { MemoryCitationSource } from '@/types';
import { CitationSourceIcon } from '../CitationSourceIcon';
import { getCitationExcerpt, getCitationTitle } from '../../utils/citation';
import { citationPopoverCardHoverClassName } from './styles';
import classNames from 'classnames';

interface MemoryCitationPreviewProps {
  source: MemoryCitationSource;
}

const MemoryCitationPreview: React.FC<MemoryCitationPreviewProps> = ({ source }) => {
  const title = getCitationTitle(source);
  const excerpt = getCitationExcerpt(source);

  return (
    <div className={classNames(citationPopoverCardHoverClassName)}>
      <div className="mt-2 line-clamp-1 text-black text-sm font-semibold leading-5">{title}</div>
      {excerpt ? (
        <div className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm font-normal text-stone-500">
          {excerpt}
        </div>
      ) : null}
    </div>
  );
};

export default MemoryCitationPreview;
