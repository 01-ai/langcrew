import { MessageChunk, MessageToolChunk } from '@/types';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

/**
 * Render component of the left message list props Type
 */
export interface BriefRendererProps {
  message: MessageChunk;
  withIcon?: boolean;
  hasUserInput?: boolean;
  send?: (content: string) => void;
  stopped?: boolean;
}

/**
 * A short rendering component for tooltype messages props Type
 */
export interface ToolBriefRendererProps extends BriefRendererProps {
  message: MessageToolChunk;
}

/**
 * Rendering component for right-detailed area props Type
 */
export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}

/**
 * Message Type Matcher - Support string, array and regular expression
 */
export type MessageTypeMatcher = string | string[] | RegExp;

/**
 * Registration Configuration for Single Message Type
 */
export interface MessageTypeConfig {
  type: MessageTypeMatcher;
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  icon?: React.ComponentType<CustomIconComponentProps>;
}

/**
 * Message Type Registration Form
 */
export declare class MessageTypeRegistry {
  public registerMessageType(config: MessageTypeConfig): void;
  public getMessageType(type: string): MessageTypeConfig | undefined;
  public getBriefRenderer(type: string): React.ComponentType<BriefRendererProps>;
  public getDetailRenderer(type: string): React.ComponentType<DetailRendererProps>;
  public getToolIcon(type: string): React.ComponentType<CustomIconComponentProps>;
}

declare const registry: MessageTypeRegistry;
export default registry;
