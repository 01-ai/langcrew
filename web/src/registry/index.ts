// message type registration mechanism
// support to register the left brief renderer (briefRenderer) and the right detail renderer (detailRenderer) for each message type
// if not registered, use the default renderer
// the container component can get the corresponding rendering component through type

import { MessageChunk, MessageToolChunk } from '@/types';
import DefaultBriefRenderer from './default/DefaultBriefRenderer';
import DefaultDetailRenderer from './default/DefaultDetailRenderer';
import { ToolIconDefault } from './common/icons';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

// ===================== interface definition =====================

/**
 * the props type of the left message list rendering component
 * @property message message data
 * @property withIcon whether to show the icon
 * @property hasUserInput whether there is user input
 */
export interface BriefRendererProps {
  message: MessageChunk;
  withIcon?: boolean;
  hasUserInput?: boolean;
}

/**
 * the props type of the brief renderer for tool type message
 * inherit from BriefRendererProps, but the message type is more specific
 */
export interface ToolBriefRendererProps extends BriefRendererProps {
  message: MessageToolChunk;
}

/**
 * the props type of the detail renderer for the right detail area
 * @property message message data
 * @property isRealTime whether it is real-time update
 */
export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}

// message type matcher - support string, array and regular expression
export type MessageTypeMatcher = string | string[] | RegExp;

/**
 * the registration configuration for a single message type
 * @property type the unique identifier for the message type, support string, string array or regular expression
 * @property briefRenderer the left message list rendering component (optional)
 * @property detailRenderer the right detail area rendering component (optional)
 * @property icon the icon component for the message type (optional)
 */
export interface MessageTypeConfig {
  type: MessageTypeMatcher;
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  icon?: React.ComponentType<CustomIconComponentProps>;
}

// ===================== implementation of the registration table =====================

/**
 * the message type registration table, support registration and get rendering component and icon
 *
 * features:
 * - support three types of matching: string, array and regular expression
 * - automatically fallback to the default rendering component
 * - singleton mode, global shared
 * - type-safe component registration and get
 */
class MessageTypeRegistry {
  private stringTypes: Map<string, MessageTypeConfig> = new Map();
  private patternTypes: Array<{ pattern: RegExp; config: MessageTypeConfig }> = [];
  private arrayTypes: Array<{ types: string[]; config: MessageTypeConfig }> = [];

  // default rendering component
  private defaultBriefRenderer: React.ComponentType<BriefRendererProps> = DefaultBriefRenderer;
  private defaultDetailRenderer: React.ComponentType<DetailRendererProps> = DefaultDetailRenderer;
  private defaultIcon: React.ComponentType<CustomIconComponentProps> = ToolIconDefault;

  /**
   * register a message type
   * @param config the message type configuration
   */
  public registerMessageType(config: MessageTypeConfig): void {
    const { type } = config;

    if (typeof type === 'string') {
      // string type: directly register to Map
      if (this.stringTypes.has(type)) {
        console.warn(`[MessageTypeRegistry] type '${type}' is already registered, will be overridden`);
      }
      this.stringTypes.set(type, config);
    } else if (Array.isArray(type)) {
      // array type: register to array configuration
      this.arrayTypes.push({ types: type, config });
    } else if (type instanceof RegExp) {
      // regular expression type: register to pattern configuration
      this.patternTypes.push({ pattern: type, config });
    }
  }

  /**
   * get the message type configuration
   * @param type the message type
   * @returns the matching configuration or undefined
   */
  public getMessageType(type: string): MessageTypeConfig | undefined {
    // 1. first check the exact match
    const exactMatch = this.stringTypes.get(type);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. check the array match
    for (const { types, config } of this.arrayTypes) {
      if (types.includes(type)) {
        return config;
      }
    }

    // 3. check the regular expression match
    for (const { pattern, config } of this.patternTypes) {
      if (pattern.test(type)) {
        return config;
      }
    }

    return undefined;
  }

  /**
   * get the left message list rendering component
   * @param type the message type
   * @returns the corresponding rendering component or the default component
   */
  public getBriefRenderer(type: string): React.ComponentType<BriefRendererProps> {
    const config = this.getMessageType(type);
    return config?.briefRenderer || this.defaultBriefRenderer;
  }

  /**
   * get the right detail area rendering component
   * @param type the message type
   * @returns the corresponding rendering component or the default component
   */
  public getDetailRenderer(type: string): React.ComponentType<DetailRendererProps> {
    const config = this.getMessageType(type);
    return config?.detailRenderer || this.defaultDetailRenderer;
  }

  /**
   * get the icon component for the message type
   * @param type the message type
   * @returns the corresponding icon component or the default icon
   */
  public getToolIcon(type: string): React.ComponentType<CustomIconComponentProps> {
    const config = this.getMessageType(type);
    return config?.icon || this.defaultIcon;
  }
}

// singleton export
const registry = new MessageTypeRegistry();

// the component library finally needs to export this singleton, so that other components can import this singleton, and then use the registerMessageType method of this singleton to register message types
export default registry;

// ===================== usage example =====================
/**
 * message type registration mechanism usage guide
 * 
 * 1. basic usage - register simple message types
 * ```typescript
 * // define custom rendering component
 * const SearchBrief: React.FC<BriefRendererProps> = ({ message }) => (
 *   <div className="search-brief">
 *     <span>🔍 search: {message.content}</span>
 *   </div>
 * );
 * 
 * const SearchDetail: React.FC<DetailRendererProps> = ({ message }) => (
 *   <div className="search-detail">
 *     <h3>search result</h3>
 *     <pre>{JSON.stringify(message.detail, null, 2)}</pre>
 *   </div>
 * );
 * 
 * // register message type
 * import registry from './registry';
 * registry.registerMessageType({
 *   type: 'web_search',
 *   briefRenderer: SearchBrief,
 *   detailRenderer: SearchDetail,
 * });
 * ```
 * 
 * 2. advanced usage - support multiple matching ways
 * ```typescript
 * // string array matching - multiple types use the same rendering component
 * registry.registerMessageType({
 *   type: ['file_read', 'file_write', 'file_delete'],
 *   briefRenderer: FileOperationBrief,
 *   detailRenderer: FileOperationDetail,
 * });
 * 
 * // regular expression matching - dynamic type matching
 * registry.registerMessageType({
 *   type: /^browser_/,
 *   briefRenderer: BrowserToolBrief,
 *   detailRenderer: BrowserToolDetail,
 *   icon: BrowserIcon,
 * });
 * ```
 * 
 * 3. use in container component
 * ```typescript
 * // left message list rendering
 * const MessageList: React.FC<{ messages: MessageChunk[] }> = ({ messages }) => {
 *   return (
 *     <div className="message-list">
 *       {messages.map((message, index) => {
 *         const BriefRenderer = registry.getBriefRenderer(message.type);
 *         return (
 *           <BriefRenderer
 *             key={index}
 *             message={message}
 *             withIcon={true}
 *           />
 *         );
 *       })}
 *     </div>
 *   );
 * };
 * 
 * // right detail area rendering
 * const MessageDetail: React.FC<{ message?: MessageChunk }> = ({ message }) => {
 *   if (!message) return null;
 *   
 *   const DetailRenderer = registry.getDetailRenderer(message.type);
 *   return (
 *     <div className="message-detail">
 *       <DetailRenderer message={message} isRealTime={false} />
 *     </div>
 *   );
 * };
 * ```
 * 
 * 4. special handling for tool type
 * ```typescript
 * // tool type message needs special handling
 * const ToolMessage: React.FC<{ message: MessageToolChunk }> = ({ message }) => {
 *   const ToolBriefRenderer = registry.getBriefRenderer(message.type);
 *   const ToolIcon = registry.getToolIcon(message.type);
 *   
 *   return (
 *     <div className="tool-message">
 *       <ToolIcon />
 *       <ToolBriefRenderer message={message} withIcon={false} />
 *     </div>
 *   );
 * };
 * ```
 * 
 * 5. file organization suggestion
 * ```
 * src/registry/
 * ├── index.ts                    # main registration table
 * ├── default/                    # default rendering component
 * ├── text/                       # text type
 * │   ├── index.ts               # registration logic
 * │   ├── TextBriefRenderer.tsx  # brief rendering
 * │   └── TextDetailRenderer.tsx # detail rendering
 * ├── web_search/                # search type
 * │   ├── index.ts
 * │   ├── WebSearchBriefRenderer.tsx
 * │   └── WebSearchDetailRenderer.tsx
 * └── common/                    # common component
 *     ├── icons.tsx
 *     └── MessageBrief.tsx
 * ```
 * 
 * 6. best practices for type safety
 * ```typescript
 * // define specific props interface for specific tool type
 * interface WebSearchBriefProps extends BriefRendererProps {
 *   message: MessageChunk & { type: 'web_search' };
 * }
 * 
 * const WebSearchBrief: React.FC<WebSearchBriefProps> = ({ message }) => {
 *   // the type of message is safe here
 *   return <div>搜索: {message.query}</div>;
 * };
 * ```
 * 
 * 7. error handling and debugging
 * ```typescript
 * // check if the message type is registered
 * const isRegistered = (type: string): boolean => {
 *   return !!registry.getMessageType(type);
 * };
 * 
 * // get all registered types
 * const getRegisteredTypes = (): string[] => {
 *   // note: here we need to extend registry to support this feature
 *   return Array.from(registry.stringTypes.keys());
 * };
 * ```
 */
