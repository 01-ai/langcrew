import { useLayoutEffect, useRef } from 'react';
import type { StoreApi } from 'zustand';
import type { AgentStore } from '@/store/agent';
import { isEqual } from 'lodash-es';

/**
 * Sync a single prop into the store
 *
 * useLayoutEffect syncs the store before paint to avoid flicker
 *
 * @param storeApi - store API
 * @param propValue - prop value to sync
 * @param setter - store setter name (e.g. 'setChatEndpoint')
 * @param options - optional config
 * @param options.condition - sync only when this returns true (default: propValue !== undefined)
 * @param options.resetValue - value applied on unmount via setter(resetValue)
 *
 * @example
 * // Simple sync
 * useSyncPropToStore(storeApi, chatEndpoint, 'setChatEndpoint');
 *
 * @example
 * // Conditional sync
 * useSyncPropToStore(storeApi, placeholder, 'setPlaceholder', {
 *   condition: (v) => !!v
 * });
 *
 * @example
 * // With cleanup
 * useSyncPropToStore(storeApi, senderContent, 'setSenderContent', {
 *   condition: (v) => typeof v === 'string',
 *   resetValue: ''
 * });
 */
export function useSyncPropToStore<T>(
  storeApi: StoreApi<AgentStore>,
  propValue: T,
  setter: keyof AgentStore,
  options?: {
    condition?: (value: T) => boolean;
    resetValue?: T; // Value applied on unmount
  },
) {
  // Depend on option values, not the whole object (avoids loops)
  const condition = options?.condition;
  const resetValue = options?.resetValue;
  const hasResetValue = options?.resetValue !== undefined;

  // Track last value and store in refs to avoid redundant sets
  const lastValueRef = useRef<T | undefined>(undefined);
  const lastStoreRef = useRef<StoreApi<AgentStore> | null>(null);

  useLayoutEffect(() => {
    const shouldSync = condition ? condition(propValue) : true;

    // Detect store identity changes (agentId / instanceKey)
    const storeChanged = lastStoreRef.current !== storeApi;

    if (shouldSync) {
      // Call setter only when the store or value actually changed
      if (storeChanged || !isEqual(lastValueRef.current, propValue)) {
        lastValueRef.current = propValue;
        lastStoreRef.current = storeApi;
        const setterFn = storeApi.getState()[setter] as (value: T) => void;
        setterFn(propValue);
      }
    }

    return () => {
      if (hasResetValue) {
        const setterFn = storeApi.getState()[setter] as (value: T) => void;
        setterFn(resetValue as T);
        lastValueRef.current = resetValue;
      }
    };
  }, [propValue, storeApi, setter, condition, resetValue, hasResetValue]);
}
