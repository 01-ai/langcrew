import React from 'react';
import { MessageItem, MessageMetadata } from '@/types';
import type { RenderMessageMetadata } from '@/types/agentx';

export interface MessagesRenderProps<TMetadata extends MessageMetadata<any> = MessageMetadata> {
  /**
   * messages to render.
   * @default []
   */
  messages: MessageItem[] | undefined;
  /**
   * Can not open message metadata Renderer. Use when not available AgentX store . The configuration or default rendering.
   */
  renderMessageMetadata?: RenderMessageMetadata<TMetadata>;
}

export declare const MessagesRender: <TMetadata extends MessageMetadata<any> = MessageMetadata>(
  props: MessagesRenderProps<TMetadata>,
) => React.ReactElement | null;
export default MessagesRender;
