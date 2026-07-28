import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';

import eventBus from '@/utils/eventBus';
import type { ActionConfig } from '@/components/widgets/types';
import { executeClientAction } from '@/sdk/clientActions';
import { WidgetRenderContext } from '@/components/WidgetRender';
import { collectFormData } from './useFormDataCollector';
import { useAgentStore } from '@/store';

export interface UseActionExecutorOptions {
  /**
   * Fields injected into every action.payload by default.
   * Commonly used for context such as the widget type or field name that triggered the action.
   */
  defaultPayload?: Record<string, unknown>;

  /**
   * Whether to collect form data automatically.
   * @default true - Collect form data from the nearest widget scope and merge it into the payload.
   */
  collectFormData?: boolean;

  /**
   * Fields injected into every action.payload by default.
   * Commonly used for context such as the widget type or field name that triggered the action.
   */
  label?: string;
}

export interface ExecuteActionOptions {
  /**
   * Payload supplied at call time. It is merged with the default payload, form data,
   * and the payload defined by the action itself.
   */
  payload?: Record<string, unknown>;
  /**
   * Raw event object passed through to the client handler.
   */
  event?: SyntheticEvent | Event | null;
  /**
   * Whether to skip form-data collection.
   * @default false
   */
  skipFormDataCollection?: boolean;
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(() => resolve(), 16);
  });

const shouldHandleLoading = (action?: ActionConfig) => {
  if (!action) return false;
  if (!action.loadingBehavior || action.loadingBehavior === 'auto') return true;
  return action.loadingBehavior !== 'none';
};

/**
 * Deeply merge objects while preserving nested properties.
 */
const deepMerge = (target: Record<string, unknown>, ...sources: Record<string, unknown>[]): Record<string, unknown> => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (!source) return deepMerge(target, ...sources);

  for (const key in source) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      target[key] = deepMerge({ ...targetValue } as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else {
      target[key] = sourceValue;
    }
  }

  return deepMerge(target, ...sources);
};

export const useActionExecutor = (options?: UseActionExecutorOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const defaultPayloadRef = useRef<Record<string, unknown>>(options?.defaultPayload ?? {});
  const collectFormDataFlag = useRef<boolean>(options?.collectFormData ?? true);
  const { isPreviewMode } = useContext(WidgetRenderContext);
  const instanceId = useAgentStore((s) => s.instanceId);

  useEffect(() => {
    defaultPayloadRef.current = options?.defaultPayload ?? {};
    collectFormDataFlag.current = options?.collectFormData ?? true;
  }, [options?.defaultPayload, options?.collectFormData]);

  const executeAction = useCallback(
    async (action?: ActionConfig, execOptions?: ExecuteActionOptions) => {
      if (!action) {
        return;
      }

      console.log('executeAction', action, execOptions);

      // Preview mode: block action execution
      if (isPreviewMode) {
        console.log('[Preview Mode] Action blocked:', {
          type: action.type,
          handler: action.handler ?? 'server',
          payload: action.payload,
        });
        return;
      }

      const manageLoading = shouldHandleLoading(action);
      if (manageLoading) {
        setIsLoading(true);
      }

      // Collect form data.
      let formData: Record<string, unknown> = {};
      if (collectFormDataFlag.current && !execOptions?.skipFormDataCollection && execOptions?.event) {
        const target = (execOptions.event as any).target || (execOptions.event as any).currentTarget;
        if (target instanceof HTMLElement) {
          // Find the nearest widget scope.
          const widgetScope = target.closest('.w-widget-scope');
          if (widgetScope instanceof HTMLElement) {
            formData = collectFormData(widgetScope);
            console.log('Collected form data:', formData);
          }
        }
      }

      // Merge precedence: action.payload < defaultPayload < formData < execOptions.payload.
      // Deep merging preserves nested object values.
      const mergedPayload: Record<string, unknown> = deepMerge(
        {},
        action.payload ?? {},
        defaultPayloadRef.current,
        formData, // Merge form fields directly into the payload instead of nesting them under formData.
        execOptions?.payload ?? {},
      );

      const params = {
        type: action.type,
        payload: mergedPayload,
        label: options?.label,
      };

      console.log('📤 Action to be sent:', params);

      try {
        if ((action.handler ?? 'server') === 'client') {
          await executeClientAction({
            action: action.type,
            payload: params,
            event: execOptions?.event ?? null,
          });
          return;
        }

        eventBus.emit(`call_send_${instanceId}`, {
          type: 'custom_action',
          params: {
            action: params,
          },
        });

        // Wait for the next frame so the loading state is rendered at least once.
        if (manageLoading) {
          await nextFrame();
        }
      } finally {
        if (manageLoading) {
          setIsLoading(false);
        }
      }
    },
    [instanceId, isPreviewMode, options?.label],
  );

  return {
    executeAction,
    isLoading,
  };
};

export default useActionExecutor;
