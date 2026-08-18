import React, { Context } from 'react';
import { JsxJson } from '@/types';
import { WidgetRenderContextValue } from './index';

// Re-export types from index.tsx to avoid duplication
export type { WidgetRenderContextValue } from './index';

export declare const WidgetRenderContext: Context<WidgetRenderContextValue>;

export interface WidgetRenderError {
  message: string;
  stack?: string;
  source: 'json' | 'jsx';
}

export interface WidgetRenderProps {
  /**
   * JSON schema for widget rendering.
   * Accepts object or JSON string. When provided, takes precedence over JSX.
   */
  json?: JsxJson | string | null;
  /**
   * JSX string for widget rendering.
   */
  jsx?: string | null;
  /**
   * Data object injected into JSX when using jsx mode.
   * Accepts object or loose JSON/JS object string.
   */
  data?: Record<string, any> | string | null;
  /**
   * Custom component map extending built-in widgets.
   */
  customComponents?: Record<string, React.ComponentType<any>>;
  /**
   * Placeholder shown when nothing to render.
   */
  placeholder?: React.ReactNode;
  /**
   * Callback fired when render error occurs.
   */
  onError?: (error: WidgetRenderError | null) => void;
  /**
   * Whether in preview mode (actions will not be executed)
   * Use this in configuration pages where users preview widgets without executing actions
   * @default false
   */
  isPreviewMode?: boolean;
}

export declare const WidgetRender: React.FC<WidgetRenderProps>;
export default WidgetRender;
