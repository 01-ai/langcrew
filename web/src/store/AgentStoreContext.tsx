import React, { createContext, useContext, ReactNode, useLayoutEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { AgentStore, createAgentStore } from './agent';
import defaultStore from './agent';
import { createRequestClient, type RequestClient } from '@/services/requestClient';

/**
 * AgentStoreApi type
 * Raw store created by createStore (zustand/vanilla)
 * Includes getState(), setState(), subscribe(), etc.
 */
type AgentStoreApi = ReturnType<typeof createAgentStore>;

/**
 * Agent store context
 * Pass distinct store instances through the tree (page vs embedded)
 */
const AgentStoreContext = createContext<AgentStoreApi | null>(null);

/**
 * Store instance cache
 * Cache store instances by instanceKey to avoid recreating them
 */
const storeCache = new Map<string, AgentStoreApi>();

/**
 * Identity selector
 * Returns the full state when no selector is passed
 */
const identitySelector = (state: AgentStore) => state;

/**
 * Agent Store Provider
 * Provide a store per instanceKey; fall back to displayMode isolation.
 *
 * @param instanceKey - Instance id used for store cache and eventBus routing.
 *   The same instanceKey shares one store instance.
 * @param displayMode - Page or embedded mode; also written to the instance state.
 * @param agentId - Optional agent id (docs/debug only)
 */
export const AgentStoreProvider = ({
  children,
  instanceKey,
  displayMode = 'page',
}: {
  children: ReactNode;
  instanceKey?: string;
  displayMode?: 'page' | 'embedded';
  agentId?: string;
}) => {
  const resolvedInstanceKey = instanceKey || displayMode;

  if (!storeCache.has(resolvedInstanceKey)) {
    storeCache.set(resolvedInstanceKey, createAgentStore(resolvedInstanceKey, displayMode));
  }

  const store = storeCache.get(resolvedInstanceKey)!;

  useLayoutEffect(() => {
    store.getState().setDisplayMode(displayMode);
  }, [displayMode, store]);

  return <AgentStoreContext.Provider value={store}>{children}</AgentStoreContext.Provider>;
};

/**
 * useAgentStore - reactive hook (triggers re-render)
 * 
 * Subscribe to store data; changes re-render the component
 * 
 * @param selector - Optional selector that subscribes only to needed data
 * @returns Selected state plus store API (getState, setState)
 * 
 * When to use:
 * ✅ Read data during render (values used in JSX)
 * ✅ Data shown in the UI
 * ✅ UI must update when data changes
 * 
 * Example:
 * ```tsx
 * // Subscribe to the full state
 * const { sessionId, pipelineMessages } = useAgentStore();
 * 
 * // Subscribe with a selector (recommended)
 * const sessionId = useAgentStore((state) => state.sessionId);
 * ```
 */
export const useAgentStore = <T = AgentStore,>(
  selector?: (state: AgentStore) => T,
): T & { getState: () => AgentStore; setState: AgentStoreApi['setState'] } => {
  const contextStore = useContext(AgentStoreContext);
  const store = contextStore || defaultStore;

  // Stable selector ref to avoid extra resubscriptions
  const finalSelector = (selector || identitySelector) as (state: AgentStore) => T;
  const state = useStore(store, finalSelector);

  // Combined state and store API
  return {
    ...(state as any),
    getState: store.getState,
    setState: store.setState,
  } as T & { getState: () => AgentStore; setState: AgentStoreApi['setState'] };
};

/**
 * useAgentStoreApi - non-reactive hook (does not re-render)
 * 
 * Return the raw store API; does not subscribe or re-render
 * 
 * @returns Raw store with getState(), setState(), subscribe(), etc.
 * 
 * When to use:
 * ✅ Use when updating data (setState or setters)
 * ✅ Read/write data in callbacks
 * ✅ Access latest state in useEffect
 * ✅ Mutate data in event handlers
 * ✅ Avoid stale closures (always the latest ref)
 * ✅ Performance (when re-render is not needed)
 * 
 * Difference from useAgentStore:
 * - useAgentStore: reactive; updates re-render → use when reading data in render
 * - useAgentStoreApi: non-reactive; updates do not re-render → use when mutating data
 * 
 * Example:
 * ```tsx
 * function ChatInput() {
 *   const storeApi = useAgentStoreApi();
 * 
 *   const handleSend = useCallback(() => {
 *     // Read latest state in callbacks without re-rendering
 *     const content = storeApi.getState().senderContent;
 *     const files = storeApi.getState().senderFiles;
 *     
 *     // Mutate state
 *     storeApi.getState().setSenderContent('');
 *   }, [storeApi]); // Stable dependency; avoids stale closures
 * 
 *   return <button onClick={handleSend}>Send</button>;
 * }
 * ```
 */
export const useAgentStoreApi = () => {
  const contextStore = useContext(AgentStoreContext);
  return contextStore || defaultStore;
};

export const useRequestClient = (): RequestClient => {
  const storeApi = useAgentStoreApi();
  return useMemo(() => createRequestClient(storeApi), [storeApi]);
};
