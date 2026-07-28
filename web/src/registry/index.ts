// Message type registration mechanism
// Supports the registration of left-hand summary rendering components for each message type (briefRenderer）and right-hand details rendering component (detailRenderer）
// Use default rendering component if not registered
// The packaging component can be made available by type Get Correlation Rendering Component

import { MessageChunk, MessageToolChunk } from '@/types';
import DefaultBriefRenderer from './default/DefaultBriefRenderer';
import DefaultDetailRenderer from './default/DefaultDetailRenderer';
import { ToolIconDefault } from './common/icons';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

// ===================== Interface definition =====================

/**
 * Render component of the left message list props Type
 * @property message Message Data
 * @property withIcon Whether to show icons
 * @property hasUserInput User input available
 * @property send Send Message Method
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
 * Inherited by BriefRendererProps，But... message Type more specific
 */
export interface ToolBriefRendererProps extends BriefRendererProps {
  message: MessageToolChunk;
}

/**
 * Rendering component for right-detailed area props Type
 * @property message Message Data
 * @property isRealTime Update on a Real Time
 */
export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}

// Message Type Matcher - Support string, array and regular expression
export type MessageTypeMatcher = string | string[] | RegExp;

/**
 * Registration Configuration for Single Message Type
 * @property type Message type unique identification, which supports string, string array or regular expression
 * @property briefRenderer Rendering component of the left message list (optional)
 * @property detailRenderer Right Details Area Rendering Component (optional)
 * @property icon Icon component for message type (optional)
 */
export interface MessageTypeConfig {
  type: MessageTypeMatcher;
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  icon?: React.ComponentType<CustomIconComponentProps>;
}

// ===================== Registration form achieved =====================

/**
 * Message type registration form to support registration and retrieval of rendering components and icons
 *
 * Functional characteristics:
 * - Supports three types of matching string, array and regular expression
 * - Autoreverse to the default rendering component
 * - Single case, global sharing
 * - Type secure component registration and acquisition
 */
class MessageTypeRegistry {
  private stringTypes: Map<string, MessageTypeConfig> = new Map();
  private patternTypes: Array<{ pattern: RegExp; config: MessageTypeConfig }> = [];
  private arrayTypes: Array<{ types: string[]; config: MessageTypeConfig }> = [];

  // Default Rendering Component
  private defaultBriefRenderer: React.ComponentType<BriefRendererProps> = DefaultBriefRenderer;
  private defaultDetailRenderer: React.ComponentType<DetailRendererProps> = DefaultDetailRenderer;
  private defaultIcon: React.ComponentType<CustomIconComponentProps> = ToolIconDefault;

  /**
   * Register a message type
   * @param config Message Type Configuration
   */
  public registerMessageType(config: MessageTypeConfig): void {
    const { type } = config;

    if (typeof type === 'string') {
      // String type: Register directly to Map Medium
      if (this.stringTypes.has(type)) {
        console.warn(`[MessageTypeRegistry] type '${type}' Registered, will be overwritten`);
      }
      this.stringTypes.set(type, config);
    } else if (Array.isArray(type)) {
      // Numeric type: Registered in array configuration
      this.arrayTypes.push({ types: type, config });
    } else if (type instanceof RegExp) {
      // Regular expression type: Registered in mode configuration
      this.patternTypes.push({ pattern: type, config });
    }
  }

  /**
   * Can not open message
   * @param type Message Type
   * @returns Matching configuration or undefined
   */
  public getMessageType(type: string): MessageTypeConfig | undefined {
    // 1. Check for exact match first.
    const exactMatch = this.stringTypes.get(type);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. Check array matching
    for (const { types, config } of this.arrayTypes) {
      if (types.includes(type)) {
        return config;
      }
    }

    // 3. Check regular match
    for (const { pattern, config } of this.patternTypes) {
      if (pattern.test(type)) {
        return config;
      }
    }

    return undefined;
  }

  /**
   * Fetch Left Message List render component
   * @param type Message Type
   * @returns Corresponding rendering component or default component
   */
  public getBriefRenderer(type: string): React.ComponentType<BriefRendererProps> {
    const config = this.getMessageType(type);
    return config?.briefRenderer || this.defaultBriefRenderer;
  }

  /**
   * Fetch Right Details Area render component
   * @param type Message Type
   * @returns Corresponding rendering component or default component
   */
  public getDetailRenderer(type: string): React.ComponentType<DetailRendererProps> {
    const config = this.getMessageType(type);
    return config?.detailRenderer || this.defaultDetailRenderer;
  }

  /**
   * Icon component for fetching message type
   * @param type Message Type
   * @returns Corresponding icon component or default icon
   */
  public getToolIcon(type: string): React.ComponentType<CustomIconComponentProps> {
    const config = this.getMessageType(type);
    return config?.icon || this.defaultIcon;
  }
}

// Single Export
const registry = new MessageTypeRegistry();

// The assembly library will end with this single case so that the other components can pass. import Import this single case, then use this single case registerMessageType Method to register message type
export default registry;

// ===================== Use Example =====================
/**
 * Guide to the use of the information type registration mechanism
 * 
 * 1. Basic use - Register Simple Message Type
 * ```typescript
 * // Define custom rendering component
 * const SearchBrief: React.FC<BriefRendererProps> = ({ message }) => (
 *   <div className="search-brief">
 *     <span>🔍 Search: {message.content}</span>
 *   </div>
 * );
 * 
 * const SearchDetail: React.FC<DetailRendererProps> = ({ message }) => (
 *   <div className="search-detail">
 *     <h3>Search Results</h3>
 *     <pre>{JSON.stringify(message.detail, null, 2)}</pre>
 *   </div>
 * );
 * 
 * // Register Message Type
 * import registry from './registry';
 * registry.registerMessageType({
 *   type: 'web_search',
 *   briefRenderer: SearchBrief,
 *   detailRenderer: SearchDetail,
 * });
 * ```
 * 
 * 2. Advanced use - Support multiple matching methods
 * ```typescript
 * // String array matching - Multiple types use the same rendering component
 * registry.registerMessageType({
 *   type: ['file_read', 'file_write', 'file_delete'],
 *   briefRenderer: FileOperationBrief,
 *   detailRenderer: FileOperationDetail,
 * });
 * 
 * // Regular expression matching - Dynamic type matching
 * registry.registerMessageType({
 *   type: /^browser_/,
 *   briefRenderer: BrowserToolBrief,
 *   detailRenderer: BrowserToolDetail,
 *   icon: BrowserIcon,
 * });
 * ```
 * 
 * 3. Use in container assemblies
 * ```typescript
 * // Rendering left message list
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
 * // Rendering area details on right
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
 * 4. Tool type special handling
 * ```typescript
 * // Tooltype messages need special handling
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
 * 5. Documentation organization recommendations
 * ```
 * src/registry/
 * ├── index.ts                    # Main registration form
 * ├── default/                    # Default Rendering Component
 * ├── text/                       # Text Type
 * │   ├── index.ts               # Registration Logic
 * │   ├── TextBriefRenderer.tsx  # Short Rendering
 * │   └── TextDetailRenderer.tsx # Details Rendering
 * ├── web_search/                # Search Type
 * │   ├── index.ts
 * │   ├── WebSearchBriefRenderer.tsx
 * │   └── WebSearchDetailRenderer.tsx
 * └── common/                    # Public Component
 *     ├── icons.tsx
 *     └── MessageBrief.tsx
 * ```
 * 
 * 6. Best practices in type security
 * ```typescript
 * // Define specific to a specific tool type props Interface
 * interface WebSearchBriefProps extends BriefRendererProps {
 *   message: MessageChunk & { type: 'web_search' };
 * }
 * 
 * const WebSearchBrief: React.FC<WebSearchBriefProps> = ({ message }) => {
 *   // Here. message The type is safe.
 *   return <div>Search: {message.query}</div>;
 * };
 * ```
 * 
 * 7. Error-processing and debugging
 * ```typescript
 * // Check if the message type is registered
 * const isRegistered = (type: string): boolean => {
 *   return !!registry.getMessageType(type);
 * };
 * 
 * // Get all registered types
 * const getRegisteredTypes = (): string[] => {
 *   // Note: This needs to be expanded. registry Support this function
 *   return Array.from(registry.stringTypes.keys());
 * };
 * ```
 */
