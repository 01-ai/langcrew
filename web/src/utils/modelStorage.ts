import type { ModelItem } from '@/types';

const STORAGE_KEY = 'agentx_selected_model';
const SCENE_STORAGE_KEY = 'agentx_selected_scene';
const KB_STORAGE_KEY = 'agentx_selected_knowledge_bases';

import { KnowledgeBaseItem } from '@/types';

/**
 * Persist the selected model to localStorage
 */
export const saveSelectedModel = (model: ModelItem | null): void => {
  try {
    if (model) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        id: model.id,
        model_display_name: model.model_display_name,
        icon: model.icon
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to save model to localStorage:', error);
  }
};

/**
 * Read the selected model from localStorage
 */
export const getSavedModel = (): ModelItem | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  } catch (error) {
    console.warn('Failed to get model from localStorage:', error);
    return null;
  }
};

/**
 * Clear the stored model selection
 */
export const clearSavedModel = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear model from localStorage:', error);
  }
};

/**
 * Persist the selected scene (tool) to localStorage
 */
export const saveSelectedScene = (sceneKey: string | null): void => {
  try {
    if (sceneKey) {
      localStorage.setItem(SCENE_STORAGE_KEY, sceneKey);
    } else {
      localStorage.removeItem(SCENE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to save scene to localStorage:', error);
  }
};

/**
 * Read the selected scene from localStorage
 */
export const getSavedScene = (): string | null => {
  try {
    return localStorage.getItem(SCENE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to get scene from localStorage:', error);
    return null;
  }
};

/**
 * Persist selected knowledge bases to localStorage
 */
export const saveSelectedKnowledgeBases = (kbs: KnowledgeBaseItem[]): void => {
  try {
    if (kbs && kbs.length > 0) {
      const kbIds = kbs.map(kb => kb.knowledge_id);
      localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(kbIds));
    } else {
      localStorage.removeItem(KB_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to save knowledge bases to localStorage:', error);
  }
};

/**
 * Read selected knowledge-base ids from localStorage
 */
export const getSavedKnowledgeBases = (): string[] => {
  try {
    const saved = localStorage.getItem(KB_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch (error) {
    console.warn('Failed to get knowledge bases from localStorage:', error);
    return [];
  }
};

