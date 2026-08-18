import { MessageChunk, MessageToolChunk, SessionInfo } from '@/types';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

/**
 * Left message-list renderer props
 */
export interface BriefRendererProps {
  message: MessageChunk;
  session?: SessionInfo;
  withIcon?: boolean;
  hasUserInput?: boolean;
  send?: (content: string) => void;
  stopped?: boolean;
}

/**
 * Tool-message brief renderer props
 */
export interface ToolBriefRendererProps extends BriefRendererProps {
  message: MessageToolChunk;
}

/**
 * Right-pane detail renderer props
 */
export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}

/**
 * Message-type matcher: string, array, or RegExp
 */
export type MessageTypeMatcher = string | string[] | RegExp;

/**
 * Registration config for one message type
 */
export interface MessageTypeConfig {
  type: MessageTypeMatcher;
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  disableWorkspace?: boolean;
  icon?: React.ComponentType<Partial<CustomIconComponentProps>>;
}

/**
 * Message-type registry
 */
export declare class MessageTypeRegistry {
  public registerMessageType(config: MessageTypeConfig): void;
  public getMessageType(type: string): MessageTypeConfig | undefined;
  public getBriefRenderer(type: string): React.ComponentType<BriefRendererProps>;
  public getDetailRenderer(type: string): React.ComponentType<DetailRendererProps>;
  public getToolIcon(type: string): React.ComponentType<Partial<CustomIconComponentProps>>;
}

declare const registry: MessageTypeRegistry;
export default registry;
