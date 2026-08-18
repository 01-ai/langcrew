// Message-type registry
// Each type can register briefRenderer (left) and detailRenderer (right)
// Use the default renderer if unregistered
// Containers look up a renderer by type

import { CitationSource, MessageChunk, MessageToolChunk, SessionInfo } from '@/types';
import DefaultBriefRenderer from './default/DefaultBriefRenderer';
import DefaultDetailRenderer from './default/DefaultDetailRenderer';
import { ToolIconDefault } from './common/icons';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

// ===================== Interfaces =====================

/**
 * Left message-list renderer props
 * @property message Message data
 * @property session Current session
 * @property withIcon Whether to show the icon
 * @property hasUserInput Whether there is user input
 * @property send Send-message method
 */
export interface BriefRendererProps {
  message: MessageChunk;
  session?: SessionInfo;
  citations?: CitationSource[];
  withIcon?: boolean;
  hasUserInput?: boolean;
  send?: (content: string) => void;
  stopped?: boolean;
}

/**
 * Tool-message brief renderer props
 * Extends BriefRendererProps with a narrower message type
 */
export interface ToolBriefRendererProps extends BriefRendererProps {
  message: MessageToolChunk;
}

/**
 * Right-pane detail renderer props
 * @property message Message data
 * @property isRealTime Whether this is a live update
 */
export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}

// Message-type matcher: string, array, or RegExp
export type MessageTypeMatcher = string | string[] | RegExp;

/**
 * Registration config for one message type
 * @property type Message-type id: string, string[], or RegExp
 * @property briefRenderer Left-list renderer (optional)
 * @property detailRenderer Right-pane renderer (optional)
 * @property disableWorkspace Disable desktop right workspace (optional)
 * @property icon Icon for this message type (optional)
 */
export interface MessageTypeConfig {
  type: MessageTypeMatcher;
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  disableWorkspace?: boolean;
  icon?: React.ComponentType<Partial<CustomIconComponentProps>>;
}

// ===================== Registry =====================

/**
 * Registry for renderers and icons
 *
 * Features:
 * - Match by string, string[], or RegExp
 * - Fall back to the default renderer
 * - Singleton, shared globally
 * - Type-safe register/get
 */
class MessageTypeRegistry {
  private stringTypes: Map<string, MessageTypeConfig> = new Map();
  private patternTypes: Array<{ pattern: RegExp; config: MessageTypeConfig }> = [];
  private arrayTypes: Array<{ types: string[]; config: MessageTypeConfig }> = [];

  // Default renderer
  private defaultBriefRenderer: React.ComponentType<BriefRendererProps> = DefaultBriefRenderer;
  private defaultDetailRenderer: React.ComponentType<DetailRendererProps> = DefaultDetailRenderer;
  private defaultIcon: React.ComponentType<Partial<CustomIconComponentProps>> = ToolIconDefault;

  /**
   * Register a message type
   * @param config Message-type config
   */
  public registerMessageType(config: MessageTypeConfig): void {
    const { type } = config;

    if (typeof type === 'string') {
      // String type: register on the Map
      if (this.stringTypes.has(type)) {
        console.warn(`[MessageTypeRegistry] type '${type}' is already registered and will be overwritten`);
      }
      this.stringTypes.set(type, config);
    } else if (Array.isArray(type)) {
      // Array type: register in array configs
      this.arrayTypes.push({ types: type, config });
    } else if (type instanceof RegExp) {
      // RegExp type: register in pattern configs
      this.patternTypes.push({ pattern: type, config });
    }
  }

  /**
   * Get message-type config
   * @param type Message type
   * @returns Matching config or undefined
   */
  public getMessageType(type: string): MessageTypeConfig | undefined {
    // 1. Exact match first
    const exactMatch = this.stringTypes.get(type);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. Array match
    for (const { types, config } of this.arrayTypes) {
      if (types.includes(type)) {
        return config;
      }
    }

    // 3. RegExp match
    for (const { pattern, config } of this.patternTypes) {
      if (pattern.test(type)) {
        return config;
      }
    }

    return undefined;
  }

  /**
   * Get the left-list renderer
   * @param type Message type
   * @returns Matching renderer or the default
   */
  public getBriefRenderer(type: string): React.ComponentType<BriefRendererProps> {
    const config = this.getMessageType(type);
    return config?.briefRenderer || this.defaultBriefRenderer;
  }

  /**
   * Get the right-pane detail renderer
   * @param type Message type
   * @returns Matching renderer or the default
   */
  public getDetailRenderer(type: string): React.ComponentType<DetailRendererProps> {
    const config = this.getMessageType(type);
    return config?.detailRenderer || this.defaultDetailRenderer;
  }

  /**
   * Get the icon for a message type
   * @param type Message type
   * @returns Matching icon or the default
   */
  public getToolIcon(type: string): React.ComponentType<Partial<CustomIconComponentProps>> {
    const config = this.getMessageType(type);
    return config?.icon || this.defaultIcon;
  }
}

// Singleton export
const registry = new MessageTypeRegistry();

// Export this singleton so others can import it and call registerMessageType
export default registry;

// ===================== Examples =====================
/**
 * Message-type registry guide
 * 
 * 1. Basic usage — register a simple message type
 * ```typescript
 * // Custom renderer
 * const SearchBrief: React.FC<BriefRendererProps> = ({ message }) => (
 *   <div className="search-brief">
 *     <span>🔍 Search: {message.content}</span>
 *   </div>
 * );
 * 
 * const SearchDetail: React.FC<DetailRendererProps> = ({ message }) => (
 *   <div className="search-detail">
 *     <h3>Search results</h3>
 *     <pre>{JSON.stringify(message.detail, null, 2)}</pre>
 *   </div>
 * );
 * 
 * // Register a message type
 * import registry from './registry';
 * registry.registerMessageType({
 *   type: 'web_search',
 *   briefRenderer: SearchBrief,
 *   detailRenderer: SearchDetail,
 * });
 * ```
 * 
 * 2. Advanced — multiple matchers
 * ```typescript
 * // String-array match — several types share one renderer
 * registry.registerMessageType({
 *   type: ['file_read', 'file_write', 'file_delete'],
 *   briefRenderer: FileOperationBrief,
 *   detailRenderer: FileOperationDetail,
 * });
 * 
 * // RegExp match
 * registry.registerMessageType({
 *   type: /^browser_/,
 *   briefRenderer: BrowserToolBrief,
 *   detailRenderer: BrowserToolDetail,
 *   icon: BrowserIcon,
 * });
 * ```
 * 
 * 3. Use in a container component
 * ```typescript
 * // Left message-list renderer
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
 * // Right-pane detail renderer
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
 * 4. Special handling for tool types
 * ```typescript
 * // Tool messages need special handling
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
 * 5. File-layout tips
 * ```
 * src/registry/
 * ├── index.ts                    # main registry
 * ├── default/                    # default renderers
 * ├── text/                       # text type
 * │   ├── index.ts               # registration
 * │   ├── TextBriefRenderer.tsx  # brief renderer
 * │   └── TextDetailRenderer.tsx # detail renderer
 * ├── web_search/                # search type
 * │   ├── index.ts
 * │   ├── WebSearchBriefRenderer.tsx
 * │   └── WebSearchDetailRenderer.tsx
 * └── common/                    # shared
 *     ├── icons.tsx
 *     └── MessageBrief.tsx
 * ```
 * 
 * 6. Type-safety practices
 * ```typescript
 * // Tool-specific props interfaces
 * interface WebSearchBriefProps extends BriefRendererProps {
 *   message: MessageChunk & { type: 'web_search' };
 * }
 * 
 * const WebSearchBrief: React.FC<WebSearchBriefProps> = ({ message }) => {
 *   // message is type-safe here
 *   return <div>Search: {message.query}</div>;
 * };
 * ```
 * 
 * 7. Errors and debugging
 * ```typescript
 * // Check whether the message type is registered
 * const isRegistered = (type: string): boolean => {
 *   return !!registry.getMessageType(type);
 * };
 * 
 * // List registered types
 * const getRegisteredTypes = (): string[] => {
 *   // Note: the registry must be extended to support this
 *   return Array.from(registry.stringTypes.keys());
 * };
 * ```
 */
