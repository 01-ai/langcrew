import { useCallback } from 'react';
import { useAgentStore } from '@/store';
import { E2BFile, FileItem } from '@/types';
import type { FilePreviewConfig, FilePreviewSource } from '@/types/agentx';

export type FilePreviewResult =
  | { handled: true }
  | { handled: false; mode: 'workspace' }
  | { handled: false; mode: 'modal' };

export interface PreviewFileOptions {
  file: E2BFile | FileItem;
  siblings?: (E2BFile | FileItem)[];
  source: FilePreviewSource;
  /** Provided by the caller in narrow-modal mode as a defaultPreview fallback */
  onOpenModal?: () => void;
}

export interface FilePreviewRuntimeState {
  layoutConfig?: { narrowMode?: boolean };
  fullscreenFilePreview?: boolean;
  filePreviewConfig?: FilePreviewConfig;
  setFileViewerFile: (file?: E2BFile | FileItem, siblings?: (E2BFile | FileItem)[]) => void;
  setLastWorkspaceAction: (action: 'auto' | 'user' | 'tool') => void;
}

export function runFilePreview(
  state: FilePreviewRuntimeState,
  options: PreviewFileOptions,
): FilePreviewResult {
  const { file, siblings = [], source, onOpenModal } = options;
  const narrowMode = state.layoutConfig?.narrowMode ?? false;
  const useWorkspace = !narrowMode || !!state.fullscreenFilePreview;

  const defaultPreview = () => {
    state.setLastWorkspaceAction('user');
    if (useWorkspace) {
      state.setFileViewerFile(file, siblings);
    } else {
      onOpenModal?.();
    }
  };

  if (state.filePreviewConfig?.onPreview) {
    state.filePreviewConfig.onPreview({
      file,
      siblings,
      source,
      defaultPreview,
    });
    return { handled: true };
  }

  if (useWorkspace) {
    state.setLastWorkspaceAction('user');
    state.setFileViewerFile(file, siblings);
    return { handled: false, mode: 'workspace' };
  }

  return { handled: false, mode: 'modal' };
}

/**
 * Auto-preview (useChunksUISync) is intercepted only when interceptAutoPreview is on.
 * @returns `true` if the caller should skip the default setFileViewerFile
 */
export function tryInterceptAutoPreview(
  state: FilePreviewRuntimeState,
  file: E2BFile | FileItem,
  siblings: (E2BFile | FileItem)[],
): boolean {
  const config = state.filePreviewConfig;
  if (!config?.interceptAutoPreview || !config.onPreview) {
    return false;
  }

  const defaultPreview = () => {
    state.setLastWorkspaceAction('auto');
    state.setFileViewerFile(file, siblings);
  };

  config.onPreview({
    file,
    siblings,
    source: 'auto' as FilePreviewSource,
    defaultPreview,
  });
  return true;
}

export function useFilePreview() {
  const {
    layoutConfig,
    fullscreenFilePreview,
    filePreviewConfig,
    setFileViewerFile,
    setLastWorkspaceAction,
  } = useAgentStore();

  const previewFile = useCallback(
    (options: PreviewFileOptions): FilePreviewResult => {
      return runFilePreview(
        {
          layoutConfig,
          fullscreenFilePreview,
          filePreviewConfig,
          setFileViewerFile,
          setLastWorkspaceAction,
        },
        options,
      );
    },
    [layoutConfig, fullscreenFilePreview, filePreviewConfig, setFileViewerFile, setLastWorkspaceAction],
  );

  return { previewFile };
}
