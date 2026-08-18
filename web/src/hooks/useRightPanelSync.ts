import { useEffect } from 'react';
import { StoreApi } from 'zustand';
import { AgentStore } from '@/store/agent';

const isRightPanelDebugEnabled = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('agentxDebugRightPanel') === 'true';
};

const debugRightPanel = (message: string, payload?: unknown) => {
  if (!isRightPanelDebugEnabled()) return;
  console.debug(`[useRightPanelSync] ${message}`, payload ?? '');
};

/**
 * useRightPanelSync Hook
 *
 * Syncs external previewConfig.rightPanelVisible with internal state
 * (workspaceVisible/fileViewerFile/citationPanelSources).
 *
 * Behavior:
 * 1. External → internal: sync when external rightPanelVisible changes
 * 2. Internal → external: notify via onRightPanelVisibleChange
 * 3. Detect controlled vs uncontrolled mode
 * 4. Prevent callback loops
 */

export interface UseRightPanelSyncOptions {
  previewConfig?: {
    rightPanelVisible?: boolean;
    onRightPanelVisibleChange?: (visible: boolean, trigger: 'auto' | 'user' | 'tool') => void;
  };
  storeApi: StoreApi<AgentStore>;
}

export const useRightPanelSync = ({ previewConfig, storeApi }: UseRightPanelSyncOptions) => {
  // 1. Set previewConfig (sync the config object only)
  useEffect(() => {
    debugRightPanel('sync previewConfig', previewConfig);
    if (previewConfig) {
      storeApi.getState().setPreviewConfig(previewConfig);
      // Controlled when rightPanelVisible is provided
      storeApi.getState().setRightPanelExternalControl(previewConfig.rightPanelVisible !== undefined);
    } else {
      storeApi.getState().setRightPanelExternalControl(false);
    }

    return () => {
      storeApi.getState().setPreviewConfig(undefined);
      storeApi.getState().setRightPanelExternalControl(false);
    };
  }, [previewConfig, storeApi]);

  // 2. External → internal: apply rightPanelVisible initial value and changes
  useEffect(() => {
    const externalVisible = previewConfig?.rightPanelVisible;

    // Skip when rightPanelVisible is not provided
    if (externalVisible === undefined) {
      return;
    }

    const state = storeApi.getState();
    const currentWorkspaceVisible = state.workspaceVisible;
    const currentFileViewerVisible = !!state.fileViewerFile;
    const currentCitationVisible = !!state.citationPanelSources?.length;
    const currentOverallVisible = currentWorkspaceVisible || currentFileViewerVisible || currentCitationVisible;
    const targetVisible = externalVisible;
    const autoOpenRightPanel = state.autoOpenRightPanel;
    // Still honor external close when auto-open is disabled, so a controlled host can hide an open sources panel.
    if (!autoOpenRightPanel && targetVisible) {
      return;
    }
    debugRightPanel('external rightPanelVisible changed', {
      externalVisible,
      currentWorkspaceVisible,
      currentFileViewerVisible,
      currentCitationVisible,
      currentOverallVisible,
    });

    // Case 1: external requests open
    if (targetVisible) {
      // No-op if a panel is already open
      if (currentOverallVisible) {
        debugRightPanel('panel already visible, skip open');
        return;
      }
      // Nothing open → open workspace when it has messages
      if (state.workspaceMessages.length > 0) {
        debugRightPanel('open workspace from external visible');
        state.setWorkspaceVisible(true);
      }
    }
    // Case 2: external requests close
    else {
      // Close only when something is open
      if (currentOverallVisible) {
        debugRightPanel('close workspace from external hidden');
        state.setFileViewerFile(undefined);
        state.setWorkspaceVisible(false);
        state.closeCitationPanel(false);
      }
    }
  }, [previewConfig?.rightPanelVisible, storeApi]);

  // 3. Internal → external: notify on workspace/fileViewer visibility changes
  useEffect(() => {
    // Prevent re-entry when the callback updates rightPanelVisible
    let isNotifying = false;

    const unsubscribe = storeApi.subscribe((state, prevState) => {
      const callback = state.previewConfig?.onRightPanelVisibleChange;

      // Skip when there is no callback or a notify is in progress
      if (!callback || isNotifying) {
        return;
      }

      // Overall visibility is true if any right panel is shown
      const currentVisible =
        state.workspaceVisible || !!state.fileViewerFile || !!state.citationPanelSources?.length;
      const prevVisible =
        prevState.workspaceVisible || !!prevState.fileViewerFile || !!prevState.citationPanelSources?.length;
      debugRightPanel('subscribed visibility changed', {
        prevWorkspaceVisible: prevState.workspaceVisible,
        prevFileViewerFile: !!prevState.fileViewerFile,
        prevCitationVisible: !!prevState.citationPanelSources?.length,
        prevVisible,
        currentWorkspaceVisible: state.workspaceVisible,
        currentFileViewerFile: !!state.fileViewerFile,
        currentCitationVisible: !!state.citationPanelSources?.length,
        currentVisible,
        lastWorkspaceAction: state.lastWorkspaceAction,
      });

      // Skip when visibility did not change
      if (currentVisible === prevVisible) {
        return;
      }
      if (!currentVisible) {
        // Sync host layout when the user closes the sources panel; keep existing Workspace/FileViewer close semantics.
        if (prevState.citationPanelSources?.length && state.lastWorkspaceAction === 'user') {
          isNotifying = true;
          try {
            callback(false, 'user');
          } finally {
            isNotifying = false;
          }
          state.setLastWorkspaceAction(undefined);
        }
        return;
      }

      // Resolve trigger source
      const trigger = state.lastWorkspaceAction || 'auto';
      debugRightPanel('notify external visibility change', { visible: currentVisible, trigger });

      // Set flag to avoid re-trigger when the callback updates rightPanelVisible
      isNotifying = true;
      try {
        // Notify host
        callback(currentVisible, trigger);
      } finally {
        isNotifying = false;
      }

      // Clear lastWorkspaceAction for the next change
      state.setLastWorkspaceAction(undefined);
    });

    return unsubscribe;
  }, [storeApi]);
};
