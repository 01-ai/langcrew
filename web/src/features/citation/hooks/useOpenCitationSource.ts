import { useCallback } from 'react';
import { useAgentStore } from '@/store';
import type { CitationSource, E2BFile, FileItem } from '@/types';
import { getCitationUrl } from '../utils/citation';

interface CitationSourceActions {
  setFileViewerFile: (file?: E2BFile | FileItem, siblings?: (E2BFile | FileItem)[]) => void;
  setLastWorkspaceAction: (action?: 'auto' | 'user' | 'tool') => void;
  openCitationPanel: (sources: CitationSource[]) => void;
  openWindow?: typeof window.open;
}

export const canOpenCitationSource = (source: CitationSource) => {
  if (source.type === 'file') {
    return Boolean(source.filename && source.key && source.url && source.content_type);
  }
  if (source.type === 'web') {
    return Boolean(getCitationUrl(source));
  }
  if (source.type === 'knowledge' || source.type === 'memory') {
    return true;
  }
  return false;
};

export const openCitationSource = async (
  source: CitationSource | CitationSource[],
  { setFileViewerFile, setLastWorkspaceAction, openCitationPanel, openWindow = window.open }: CitationSourceActions,
) => {
  if (Array.isArray(source)) {
    if (source.length === 0) return false;
    openCitationPanel(source);
    return true;
  }

  if (source.type === 'file') {
    setLastWorkspaceAction('user');
    setFileViewerFile({
      filename: source.filename,
      path: source.key,
      url: source.url,
      size: source.size,
      content_type: source.content_type,
    });
    return true;
  }

  if (source.type === 'knowledge' || source.type === 'memory') {
    openCitationPanel([source]);
    return true;
  }

  const url = source.type === 'web' ? getCitationUrl(source) : undefined;
  if (!url) return false;

  const openedWindow = openWindow(url, '_blank', 'noopener,noreferrer');
  if (openedWindow) {
    openedWindow.opener = null;
  }
  return true;
};

export const useOpenCitationSource = () => {
  const { setFileViewerFile, setLastWorkspaceAction, openCitationPanel } = useAgentStore();

  return useCallback(
    (source: CitationSource | CitationSource[]) =>
      openCitationSource(source, {
        setFileViewerFile,
        setLastWorkspaceAction,
        openCitationPanel,
      }),
    [openCitationPanel, setFileViewerFile, setLastWorkspaceAction],
  );
};

export default useOpenCitationSource;
