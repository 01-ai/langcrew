import React, { useEffect, useMemo, createContext } from 'react';
import { jsxStringToJsx, jsonToJsx } from '@/engines/jsonToJsx';
import { JsxJson } from '@/types';
import { parseJsObject } from '@/utils/parseJsObject';
import { AlertCircle } from 'lucide-react';
import type { WidgetRenderProps } from './index.d';

/**
 * Context for WidgetRender to control preview mode and other render behaviors
 */
export interface WidgetRenderContextValue {
  /**
   * Whether in preview mode (actions will not be executed)
   * @default false
   */
  isPreviewMode: boolean;
}

export const WidgetRenderContext = createContext<WidgetRenderContextValue>({
  isPreviewMode: false,
});
export interface WidgetRenderError {
  message: string;
  stack?: string;
  source: 'json' | 'jsx';
}

interface WidgetRenderResult {
  element: React.ReactElement | null;
  error: WidgetRenderError | null;
  source: 'json' | 'jsx' | null;
}

const toWidgetRenderError = (error: unknown, source: 'json' | 'jsx'): WidgetRenderError => {
  const err = error as Error;
  return {
    message: err?.message || `Failed to render ${source.toUpperCase()} widget`,
    stack: err?.stack,
    source,
  };
};

const ErrorDisplay: React.FC<{ error: WidgetRenderError | null }> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <div className="flex items-center gap-2 font-semibold text-red-700 mb-2 text-sm">
        <AlertCircle className="w-5 h-5" />
        <span>Error</span>
      </div>
      <div className="text-red-700 text-sm mb-3 break-words">{error.message}</div>
      {error.stack && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
          <pre className="text-xs text-gray-600 font-mono">{error.stack}</pre>
        </div>
      )}
    </div>
  );
};

const PreviewContent: React.FC<{
  element: React.ReactElement | null;
  error: WidgetRenderError | null;
  placeholder: React.ReactNode;
}> = ({ element, error, placeholder }) => {
  if (error) return <ErrorDisplay error={error} />;
  if (element) return element;
  return placeholder;
};

const WidgetRenderComponent: React.FC<WidgetRenderProps> = ({
  json,
  jsx,
  data,
  customComponents,
  placeholder = 'Edit the code to preview',
  onError,
  isPreviewMode = false,
}) => {
  const renderResult = useMemo<WidgetRenderResult>(() => {
    const hasJson = typeof json === 'string' ? json.trim().length > 0 : json !== undefined && json !== null;

    if (hasJson) {
      try {
        const parsedJson =
          typeof json === 'string' ? (json.trim() ? (JSON.parse(json) as JsxJson) : null) : (json as JsxJson);

        if (!parsedJson) {
          return { element: null, error: null, source: 'json' };
        }

        const element = jsonToJsx(parsedJson, customComponents);
        return { element, error: null, source: 'json' };
      } catch (error) {
        return { element: null, error: toWidgetRenderError(error, 'json'), source: 'json' };
      }
    }

    const hasJsx = typeof jsx === 'string' ? jsx.trim().length > 0 : false;

    if (hasJsx && typeof jsx === 'string') {
      try {
        const parsedData =
          typeof data === 'string' ? (data.trim() ? parseJsObject(data) : undefined) : data || undefined;
        const element = jsxStringToJsx(jsx, parsedData, customComponents);
        return { element, error: null, source: 'jsx' };
      } catch (error) {
        return { element: null, error: toWidgetRenderError(error, 'jsx'), source: 'jsx' };
      }
    }

    return { element: null, error: null, source: null };
  }, [json, jsx, data, customComponents]);

  useEffect(() => {
    if (onError) {
      onError(renderResult.error);
    }
  }, [renderResult.error, onError]);

  const contextValue = useMemo<WidgetRenderContextValue>(
    () => ({
      isPreviewMode,
    }),
    [isPreviewMode],
  );

  return (
    <WidgetRenderContext.Provider value={contextValue}>
      <PreviewContent element={renderResult.element} error={renderResult.error} placeholder={placeholder} />
    </WidgetRenderContext.Provider>
  );
};

export { WidgetRenderComponent as WidgetRender };
export default WidgetRenderComponent;
