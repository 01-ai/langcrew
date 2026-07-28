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
 * I'm in charge of the synchronizing of the outside. previewConfig.rightPanelVisible and internal state (workspaceVisible/fileViewerFile）
 *
 * Function:
 * 1. External → Internal: external rightPanelVisible Sync to Internal Status when Change
 * 2. Internal → External: when internal state changes, by onRightPanelVisibleChange External notification
 * 3. Automatically recognize controlled/Uncontrolled mode
 * 4. Prevent the loop of death caused by a return call
 */

export interface UseRightPanelSyncOptions {
  previewConfig?: {
    rightPanelVisible?: boolean;
    onRightPanelVisibleChange?: (visible: boolean, trigger: 'auto' | 'user' | 'tool') => void;
  };
  storeApi: StoreApi<AgentStore>;
}

export const useRightPanelSync = ({ previewConfig, storeApi }: UseRightPanelSyncOptions) => {
  // 1. Settings previewConfig（Synchronize only the object itself)
  useEffect(() => {
    debugRightPanel('sync previewConfig', previewConfig);
    if (previewConfig) {
      storeApi.getState().setPreviewConfig(previewConfig);
      // external control of marking: provided rightPanelVisible It's controlled.
      storeApi.getState().setRightPanelExternalControl(previewConfig.rightPanelVisible !== undefined);
    } else {
      storeApi.getState().setRightPanelExternalControl(false);
    }

    return () => {
      storeApi.getState().setPreviewConfig(undefined);
      storeApi.getState().setRightPanelExternalControl(false);
    };
  }, [previewConfig, storeApi]);

  // 2. External → Internal: processing rightPanelVisible Initial values and changes
  useEffect(() => {
    const externalVisible = previewConfig?.rightPanelVisible;

    // If not provided rightPanelVisible，Do Not Process
    if (externalVisible === undefined) {
      return;
    }

    const state = storeApi.getState();
    const currentWorkspaceVisible = state.workspaceVisible;
    const currentFileViewerVisible = !!state.fileViewerFile;
    const currentOverallVisible = currentWorkspaceVisible || currentFileViewerVisible;
    const targetVisible = externalVisible;
    const autoOpenRightPanel = state.autoOpenRightPanel;
    if (!autoOpenRightPanel) {
      return;
    }
    debugRightPanel('external rightPanelVisible changed', {
      externalVisible,
      currentWorkspaceVisible,
      currentFileViewerVisible,
      currentOverallVisible,
    });

    // Situation1: External Request Open
    if (targetVisible) {
      // If there's something open, do not operate.
      if (currentOverallVisible) {
        debugRightPanel('panel already visible, skip open');
        return;
      }
      // None opened → Open workspace
      // Only there is.workspaceOpen on Messageworkspace
      if (state.workspaceMessages.length > 0) {
        debugRightPanel('open workspace from external visible');
        state.setWorkspaceVisible(true);
      }
    }
    // Case 2: the external controller requests that the panel close.
    else {
      // Only when something opens.
      if (currentOverallVisible) {
        debugRightPanel('close workspace from external hidden');
        state.setFileViewerFile(undefined);
        state.setWorkspaceVisible(false);
      }
    }
  }, [previewConfig?.rightPanelVisible, storeApi]);

  // 3. Internal → External: unified listening workspace and fileViewer Change of status, external notification
  useEffect(() => {
    // To prevent external feedback from updating rightPanelVisible The resulting repetition trigger
    let isNotifying = false;

    const unsubscribe = storeApi.subscribe((state, prevState) => {
      const callback = state.previewConfig?.onRightPanelVisibleChange;

      // If no callback or notification is ongoing, not processed
      if (!callback || isNotifying) {
        return;
      }

      // Calculate Current"Visibility"：workspace Show or fileViewer Show
      const currentVisible = state.workspaceVisible || !!state.fileViewerFile;
      const prevVisible = prevState.workspaceVisible || !!prevState.fileViewerFile;
      debugRightPanel('subscribed visibility changed', {
        prevWorkspaceVisible: prevState.workspaceVisible,
        prevFileViewerFile: !!prevState.fileViewerFile,
        prevVisible,
        currentWorkspaceVisible: state.workspaceVisible,
        currentFileViewerFile: !!state.fileViewerFile,
        currentVisible,
        lastWorkspaceAction: state.lastWorkspaceAction,
      });

      // The state is unchanged, not triggered.
      if (currentVisible === prevVisible) {
        return;
      }
      // Shut down the workspace inside, not outside.
      if (!currentVisible) {
        return;
      }

      // Get Trigger Source
      const trigger = state.lastWorkspaceAction || 'auto';
      debugRightPanel('notify external visibility change', { visible: currentVisible, trigger });

      // Set signage to avoid back-to-back updates rightPanelVisible The resulting repetition trigger
      isNotifying = true;
      try {
        // Notify outer layer
        callback(currentVisible, trigger);
      } finally {
        isNotifying = false;
      }

      // Clear lastWorkspaceAction For next use
      state.setLastWorkspaceAction(undefined);
    });

    return unsubscribe;
  }, [storeApi]);
};
