import { useCallback, useEffect, useRef } from 'react';
import type { KnowledgeBaseItem, ModelItem, SessionInfo } from '@/types';
import { getSavedKnowledgeBases, getSavedModel, saveSelectedKnowledgeBases } from '@/utils/modelStorage';
import { getEnglishLabel } from '../utils/senderOptions';

type AgentStoreApi = ReturnType<typeof import('@/store').useAgentStoreApi>;

interface SenderMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface UseSenderSessionSyncProps {
  sessionInfo?: SessionInfo;
  showSenderActions: boolean;
  menuItems: SenderMenuItem[];
  selectedScene: string | null;
  setSelectedScene: (scene: string | null) => void;
  generalAgentMode?: string;
  setGeneralAgentMode: (mode?: string) => void;
  senderKnowledgeBases: KnowledgeBaseItem[];
  selectedSenderKnowledgeBases: KnowledgeBaseItem[];
  setSelectedSenderKnowledgeBases: (items: KnowledgeBaseItem[]) => void;
  senderModels?: ModelItem[];
  selectedSenderModels: ModelItem[];
  setSelectedSenderModels: (items: ModelItem[]) => void;
  storeApi: AgentStoreApi;
}

const getDefaultModel = (models: ModelItem[] | undefined) => {
  if (!models?.length) return undefined;
  return models.find((model) => model.is_default === 1) || models[0];
};

export const useSenderSessionSync = ({
  sessionInfo,
  showSenderActions,
  menuItems,
  selectedScene,
  setSelectedScene,
  generalAgentMode,
  setGeneralAgentMode,
  senderKnowledgeBases,
  selectedSenderKnowledgeBases,
  setSelectedSenderKnowledgeBases,
  senderModels,
  selectedSenderModels,
  setSelectedSenderModels,
  storeApi,
}: UseSenderSessionSyncProps) => {
  const isKbRestored = useRef(false);
  const isSceneRestored = useRef(false);
  const kbSessionIdRef = useRef<string | undefined>(undefined);
  const sceneSessionIdRef = useRef<string | undefined>(undefined);
  const modelSessionIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isSceneRestored.current) return;
    if (!showSenderActions || selectedScene) return;

    if (generalAgentMode && menuItems.length) {
      const matchedScene = menuItems.find((item) => {
        return item.key === generalAgentMode || getEnglishLabel(item.key) === generalAgentMode || item.label === generalAgentMode;
      });
      if (matchedScene) {
        setSelectedScene(matchedScene.key);
      }
    }
    if (menuItems.length) {
      isSceneRestored.current = true;
    }
  }, [showSenderActions, generalAgentMode, menuItems, selectedScene, setSelectedScene]);

  const updateSelectedItems = useCallback(
    (session: SessionInfo) => {
      // Scene restore is guarded by session id to avoid overwriting user's in-session change
      // when sessionInfo updates for non-critical reasons (title/status refresh).
      if (showSenderActions && menuItems.length && session?.session_id) {
        const isNewSession = sceneSessionIdRef.current !== session.session_id;
        if (isNewSession) {
          sceneSessionIdRef.current = session.session_id;
          const sessionScene = session.general_agent_mode?.trim();
          if (sessionScene) {
            setGeneralAgentMode(sessionScene);
            const matchedScene = menuItems.find((item) => {
              return item.key === sessionScene || getEnglishLabel(item.key) === sessionScene || item.label === sessionScene;
            });
            if (matchedScene) {
              setSelectedScene(matchedScene.key);
            }
          }
        }
      }

      const isNewKbSession = !!session?.session_id && kbSessionIdRef.current !== session.session_id;
      const hasKbUserSelection = (storeApi.getState().selectedSenderKnowledgeBases?.length || 0) > 0;
      const shouldInitializeKb = isNewKbSession || !hasKbUserSelection;

      if (shouldInitializeKb) {
        if (isNewKbSession) {
          kbSessionIdRef.current = session.session_id;
        }

        const sessionKnowledgeIds = session?.knowledge_query_request?.knowledge_ids;
        if (session?.knowledge_query_request && senderKnowledgeBases.length) {
          const selectedKnowledgeBases = senderKnowledgeBases.filter((item) =>
            (sessionKnowledgeIds || []).includes(item.knowledge_id),
          );
          setSelectedSenderKnowledgeBases(selectedKnowledgeBases);
        } else if (senderKnowledgeBases.length) {
          const savedKbIds = getSavedKnowledgeBases();
          if (savedKbIds.length > 0) {
            const validSavedKBs = senderKnowledgeBases.filter((item) => savedKbIds.includes(item.knowledge_id));
            if (validSavedKBs.length > 0) {
              setSelectedSenderKnowledgeBases(validSavedKBs);
            }
          }
        }
      }

      const isNewSession = !!session?.session_id && modelSessionIdRef.current !== session.session_id;
      const hasUserSelection = (storeApi.getState().selectedSenderModels?.length || 0) > 0;
      const shouldInitializeModel = isNewSession || !hasUserSelection;

      if (!shouldInitializeModel) return;
      if (isNewSession) {
        modelSessionIdRef.current = session.session_id;
      }

      if (session?.model && senderModels?.length) {
        // Priority: session model -> saved model (if session gives default) -> default model.
        const selectedModel = senderModels.find((model) => model.id === session.model?.id);
        const savedModel = getSavedModel();
        const defaultModel = getDefaultModel(senderModels);

        let targetModel = selectedModel;
        if (
          savedModel &&
          defaultModel &&
          selectedModel?.id === defaultModel.id &&
          savedModel.id !== defaultModel.id
        ) {
          const availableSavedModel = senderModels.find((model) => model.id === savedModel.id);
          if (availableSavedModel) {
            targetModel = availableSavedModel;
          }
        }

        if (targetModel) {
          setSelectedSenderModels([targetModel]);
        } else {
          setSelectedSenderModels([]);
        }
        return;
      }

      const savedModel = getSavedModel();
      if (savedModel && senderModels?.length) {
        const availableModel = senderModels.find((model) => model.id === savedModel.id);
        if (availableModel) {
          setSelectedSenderModels([availableModel]);
        } else {
          setSelectedSenderModels([]);
        }
        return;
      }

      const defaultModel = getDefaultModel(senderModels);
      if (defaultModel) {
        setSelectedSenderModels([defaultModel]);
      } else {
        setSelectedSenderModels([]);
      }
    },
    [
      showSenderActions,
      menuItems,
      setGeneralAgentMode,
      setSelectedScene,
      storeApi,
      senderKnowledgeBases,
      setSelectedSenderKnowledgeBases,
      senderModels,
      setSelectedSenderModels,
    ],
  );

  useEffect(() => {
    if (sessionInfo) {
      updateSelectedItems(sessionInfo);
    }
  }, [sessionInfo, updateSelectedItems]);

  useEffect(() => {
    if (senderModels?.length > 0 && selectedSenderModels.length === 0 && !sessionInfo?.model) {
      const savedModel = getSavedModel();
      if (savedModel) {
        const availableModel = senderModels.find((model) => model.id === savedModel.id);
        if (availableModel) {
          setSelectedSenderModels([availableModel]);
          return;
        }
      }

      const defaultModel = getDefaultModel(senderModels);
      if (defaultModel) {
        setSelectedSenderModels([defaultModel]);
      }
    }
  }, [senderModels, selectedSenderModels.length, sessionInfo?.model, setSelectedSenderModels]);

  useEffect(() => {
    if (isKbRestored.current) return;
    if (!senderKnowledgeBases.length) return;

    if (selectedSenderKnowledgeBases.length === 0) {
      const savedKbIds = getSavedKnowledgeBases();
      if (savedKbIds.length > 0 && !sessionInfo) {
        const validSavedKBs = senderKnowledgeBases.filter((item) => savedKbIds.includes(item.knowledge_id));
        if (validSavedKBs.length > 0) {
          setSelectedSenderKnowledgeBases(validSavedKBs);
        }
      }
    }

    isKbRestored.current = true;
  }, [senderKnowledgeBases, selectedSenderKnowledgeBases.length, sessionInfo, setSelectedSenderKnowledgeBases]);

  useEffect(() => {
    if (!showSenderActions && selectedScene) {
      setSelectedScene(null);
    }
  }, [showSenderActions, selectedScene, setSelectedScene]);

  useEffect(() => {
    saveSelectedKnowledgeBases(selectedSenderKnowledgeBases);
  }, [selectedSenderKnowledgeBases]);
};
