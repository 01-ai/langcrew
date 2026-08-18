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
   * Custom message metadata renderer. Falls back to the AgentX store config or default renderer.
   */
  renderMessageMetadata?: RenderMessageMetadata<TMetadata>;
}

export declare const MessagesRender: <TMetadata extends MessageMetadata<any> = MessageMetadata>(
  props: MessagesRenderProps<TMetadata>,
) => React.ReactElement | null;
export default MessagesRender;
