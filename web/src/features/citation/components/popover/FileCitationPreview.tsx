import React from 'react';
import type { FileCitationSource } from '@/types';
import { getCitationTitle } from '../../utils/citation';
import { formatSize } from '@/utils/fileHelpers';
import { getFileIcon } from '@/utils/file';
import classNames from 'classnames';
import { citationPopoverCardHoverBG } from './styles';
import { canOpenCitationSource, useOpenCitationSource } from '../../hooks/useOpenCitationSource';

interface FileCitationPreviewProps {
  source: FileCitationSource;
}

const FileCitationPreview: React.FC<FileCitationPreviewProps> = ({ source }) => {
  const openCitationSource = useOpenCitationSource();
  const canOpen = canOpenCitationSource(source);
  const subtitle = formatSize(source.size);
  const title = getCitationTitle(source);

  return (
    <button
      type="button"
      disabled={!canOpen}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        if (!canOpen) return;
        void openCitationSource(source);
      }}
      className={classNames(
        'w-full p-3 bg-white rounded-xl border border-[#EAEAEA] flex items-center gap-2 overflow-hidden text-left',
        {
          'cursor-pointer': canOpen,
          'cursor-default': !canOpen,
        },
        canOpen ? citationPopoverCardHoverBG : undefined,
      )}
    >
      <div className="size-8 shrink-0 rounded-lg overflow-hidden [&>svg]:size-8" aria-hidden="true">
        {getFileIcon(source.filename)}
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="text-black text-sm leading-5 line-clamp-2">{title}</div>
        <div className="opacity-30 text-black text-[10px] leading-3 line-clamp-2">{subtitle}</div>
      </div>
    </button>
  );
};

export default FileCitationPreview;
