import { useLayoutEffect, useRef } from 'react';
import type { StoreApi } from 'zustand';
import type { AgentStore } from '@/store/agent';
import { isEqual } from 'lodash-es';

/**
 * Will be Single prop Sync to store
 *
 * Use useLayoutEffect to update the store before the browser paints and avoid visual flicker.
 *
 * @param storeApi - Store API Example
 * @param propValue - Synchronise prop Value
 * @param setter - store Medium setter Function name (e. g.) 'setChatEndpoint'）
 * @param options - Optional Configuration
 * @param options.condition - Conditional judgement function, return true Sync only (default check) propValue !== undefined）
 * @param options.resetValue - reset value when component is unmounted, if provided, in cleanup Time Call setter(resetValue)
 *
 * @example
 * // Simple Sync
 * useSyncPropToStore(storeApi, chatEndpoint, 'setChatEndpoint');
 *
 * @example
 * // Sync with Conditions
 * useSyncPropToStore(storeApi, placeholder, 'setPlaceholder', {
 *   condition: (v) => !!v
 * });
 *
 * @example
 * // Bring clean logic
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
    resetValue?: T; // The value that is being reset when the component is unmounted
  },
) {
  // Extract options value, avoid the whole object being relied upon to cause infinite circulation
  const condition = options?.condition;
  const resetValue = options?.resetValue;
  const hasResetValue = options?.resetValue !== undefined;

  // Use ref To track last set values and last used ones store，Avoiding duplication settings
  const lastValueRef = useRef<T | undefined>(undefined);
  const lastStoreRef = useRef<StoreApi<AgentStore> | null>(null);

  useLayoutEffect(() => {
    const shouldSync = condition ? condition(propValue) : true;

    // Check if store Change (agentId or displayMode (as a result of changes)
    const storeChanged = lastStoreRef.current !== storeApi;

    if (shouldSync) {
      // When? store Call when change occurs, or when the value changes setter
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
