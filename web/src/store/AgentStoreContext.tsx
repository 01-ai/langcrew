import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useStore } from 'zustand';
import { AgentStore, createAgentStore } from './agent';
import defaultStore from './agent';
import { createRequestClient, type RequestClient } from '@/services/requestClient';

/**
 * The vanilla Zustand store created by createAgentStore.
 * It exposes getState(), setState(), subscribe(), and the other store methods.
 */
type AgentStoreApi = ReturnType<typeof createAgentStore>;

/**
 * Context for passing separate Agent store instances through component trees,
 * such as page and embedded modes.
 */
const AgentStoreContext = createContext<AgentStoreApi | null>(null);

/**
 * Cache store instances by instanceKey to avoid creating duplicates.
 */
const storeCache = new Map<string, AgentStoreApi>();

/**
 * Identity selector used when no selector is provided.
 */
const identitySelector = (state: AgentStore) => state;

/**
 * Agent Store Provider
 * Provides a store instance for the given instanceKey.
 *
 * @param instanceKey - Unique key used for store caching and event-bus routing.
 *   Components with the same instanceKey share one store instance.
 * @param agentId - Optional Agent identifier used only for documentation and debugging.
 */
export const AgentStoreProvider = ({
  children,
  instanceKey,
}: {
  children: ReactNode;
  instanceKey: string;
  agentId?: string;
}) => {
  if (!storeCache.has(instanceKey)) {
    storeCache.set(instanceKey, createAgentStore(instanceKey));
  }

  const store = storeCache.get(instanceKey)!;

  return <AgentStoreContext.Provider value={store}>{children}</AgentStoreContext.Provider>;
};

/**
 * useAgentStore - Reactive hook that triggers a re-render when selected data changes.
 * 
 * Subscribes a component to store data.
 * 
 * @param selector - Optional selector that limits the subscription to required data.
 * @returns The selected state plus the getState and setState APIs.
 * 
 * Use this hook when rendering store data or updating the UI when that data changes.
 * 
 * Example:
 * ```tsx
 * // Subscribe to all data.
 * const { sessionId, pipelineMessages } = useAgentStore();
 * 
 * // Subscribe only to the required data (recommended).
 * const sessionId = useAgentStore((state) => state.sessionId);
 * ```
 */
export const useAgentStore = <T = AgentStore,>(
  selector?: (state: AgentStore) => T,
): T & { getState: () => AgentStore; setState: AgentStoreApi['setState'] } => {
  const contextStore = useContext(AgentStoreContext);
  const store = contextStore || defaultStore;

  // Keep the selector reference stable to avoid unnecessary resubscriptions.
  const finalSelector = (selector || identitySelector) as (state: AgentStore) => T;
  const state = useStore(store, finalSelector);

  // Return the selected state together with the store API.
  return {
    ...(state as any),
    getState: store.getState,
    setState: store.setState,
  } as T & { getState: () => AgentStore; setState: AgentStoreApi['setState'] };
};

/**
 * useAgentStoreApi - Non-reactive hook that does not trigger re-renders.
 * 
 * Returns the raw store API without subscribing to state changes.
 * 
 * @returns The raw store object, including getState(), setState(), and subscribe().
 * 
 * Use this hook to update data, read current state in callbacks or effects,
 * avoid stale closures, or access state without subscribing to re-renders.
 * 
 * Difference from useAgentStore:
 * - useAgentStore: reactive; use it to read data during rendering.
 * - useAgentStoreApi: non-reactive; use it to read or update data imperatively.
 * 
 * Example:
 * ```tsx
 * function ChatInput() {
 *   const storeApi = useAgentStoreApi();
 * 
 *   const handleSend = useCallback(() => {
 *     // Read the latest state without causing a component re-render.
 *     const content = storeApi.getState().senderContent;
 *     const files = storeApi.getState().senderFiles;
 *     
 *     // Update state.
 *     storeApi.getState().setSenderContent('');
 *   }, [storeApi]); // The stable dependency avoids stale closures.
 * 
 *   return <button onClick={handleSend}>Send</button>;
 * }
 * ```
 */
export const useAgentStoreApi = () => {
  const contextStore = useContext(AgentStoreContext);
  return contextStore || defaultStore;
};

/**
 * Returns a request client bound to the current AgentStore instance.
 * The client automatically includes the instance's extraHeaders in every API call.
 */
export const useRequestClient = (): RequestClient => {
  const storeApi = useAgentStoreApi();
  return useMemo(() => createRequestClient(storeApi), [storeApi]);
};
