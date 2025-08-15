// 消息类型注册机制
// 支持为每种消息类型注册左侧简要渲染组件（briefRenderer）和右侧详情渲染组件（detailRenderer）
// 若未注册则使用默认渲染组件
// 容器组件可通过 type 获取对应渲染组件

import { MessageChunk, MessageToolChunk } from '@/types';
import DefaultBriefRenderer from './default/DefaultBriefRenderer';
import DefaultDetailRenderer from './default/DefaultDetailRenderer';
import { ToolIconDefault } from './common/icons';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

// ===================== 接口定义 =====================

/**
 * 左侧消息列表渲染组件 props 类型
 * @property message 消息数据
 * @property withIcon 是否显示图标
 * @property hasUserInput 是否有用户输入
 */
export interface BriefRendererProps {
  message: MessageChunk;
  withIcon?: boolean;
  hasUserInput?: boolean;
}

/**
 * 工具类型消息的简要渲染组件 props 类型
 * 继承自 BriefRendererProps，但 message 类型更具体
 */
export interface ToolBriefRendererProps extends BriefRendererProps {
  message: MessageToolChunk;
}

/**
 * 右侧详情区域渲染组件 props 类型
 * @property message 消息数据
 * @property isRealTime 是否为实时更新
 */
export interface DetailRendererProps {
  message: MessageChunk;
  isRealTime?: boolean;
}

// 消息类型匹配器 - 支持字符串、数组和正则表达式
export type MessageTypeMatcher = string | string[] | RegExp;

/**
 * 单个消息类型的注册配置
 * @property type 消息类型唯一标识，支持字符串、字符串数组或正则表达式
 * @property briefRenderer 左侧消息列表渲染组件（可选）
 * @property detailRenderer 右侧详情区域渲染组件（可选）
 * @property icon 消息类型对应的图标组件（可选）
 */
export interface MessageTypeConfig {
  type: MessageTypeMatcher;
  briefRenderer?: React.ComponentType<BriefRendererProps>;
  detailRenderer?: React.ComponentType<DetailRendererProps>;
  icon?: React.ComponentType<CustomIconComponentProps>;
}

// ===================== 注册表实现 =====================

/**
 * 消息类型注册表，支持注册和获取渲染组件以及图标
 *
 * 功能特性：
 * - 支持字符串、数组和正则表达式三种类型匹配方式
 * - 自动回退到默认渲染组件
 * - 单例模式，全局共享
 * - 类型安全的组件注册和获取
 */
class MessageTypeRegistry {
  private stringTypes: Map<string, MessageTypeConfig> = new Map();
  private patternTypes: Array<{ pattern: RegExp; config: MessageTypeConfig }> = [];
  private arrayTypes: Array<{ types: string[]; config: MessageTypeConfig }> = [];

  // 默认渲染组件
  private defaultBriefRenderer: React.ComponentType<BriefRendererProps> = DefaultBriefRenderer;
  private defaultDetailRenderer: React.ComponentType<DetailRendererProps> = DefaultDetailRenderer;
  private defaultIcon: React.ComponentType<CustomIconComponentProps> = ToolIconDefault;

  /**
   * 注册一个消息类型
   * @param config 消息类型配置
   */
  public registerMessageType(config: MessageTypeConfig): void {
    const { type } = config;

    if (typeof type === 'string') {
      // 字符串类型：直接注册到 Map 中
      if (this.stringTypes.has(type)) {
        console.warn(`[MessageTypeRegistry] type '${type}' 已注册，将被覆盖`);
      }
      this.stringTypes.set(type, config);
    } else if (Array.isArray(type)) {
      // 数组类型：注册到数组配置中
      this.arrayTypes.push({ types: type, config });
    } else if (type instanceof RegExp) {
      // 正则表达式类型：注册到模式配置中
      this.patternTypes.push({ pattern: type, config });
    }
  }

  /**
   * 获取消息类型配置
   * @param type 消息类型
   * @returns 匹配的配置或 undefined
   */
  public getMessageType(type: string): MessageTypeConfig | undefined {
    // 1. 先检查精确匹配
    const exactMatch = this.stringTypes.get(type);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. 检查数组匹配
    for (const { types, config } of this.arrayTypes) {
      if (types.includes(type)) {
        return config;
      }
    }

    // 3. 检查正则匹配
    for (const { pattern, config } of this.patternTypes) {
      if (pattern.test(type)) {
        return config;
      }
    }

    return undefined;
  }

  /**
   * 获取左侧消息列表渲染组件
   * @param type 消息类型
   * @returns 对应的渲染组件或默认组件
   */
  public getBriefRenderer(type: string): React.ComponentType<BriefRendererProps> {
    const config = this.getMessageType(type);
    return config?.briefRenderer || this.defaultBriefRenderer;
  }

  /**
   * 获取右侧详情区域渲染组件
   * @param type 消息类型
   * @returns 对应的渲染组件或默认组件
   */
  public getDetailRenderer(type: string): React.ComponentType<DetailRendererProps> {
    const config = this.getMessageType(type);
    return config?.detailRenderer || this.defaultDetailRenderer;
  }

  /**
   * 获取消息类型对应的图标组件
   * @param type 消息类型
   * @returns 对应的图标组件或默认图标
   */
  public getToolIcon(type: string): React.ComponentType<CustomIconComponentProps> {
    const config = this.getMessageType(type);
    return config?.icon || this.defaultIcon;
  }
}

// 单例导出
const registry = new MessageTypeRegistry();

// 组件库最后要导出这个单例，这样其他组件就可以通过 import 导入这个单例，然后使用这个单例的 registerMessageType 方法来注册消息类型
export default registry;

// ===================== 使用示例 =====================
/**
 * 消息类型注册机制使用指南
 * 
 * 1. 基本用法 - 注册简单的消息类型
 * ```typescript
 * // 定义自定义渲染组件
 * const SearchBrief: React.FC<BriefRendererProps> = ({ message }) => (
 *   <div className="search-brief">
 *     <span>🔍 搜索: {message.content}</span>
 *   </div>
 * );
 * 
 * const SearchDetail: React.FC<DetailRendererProps> = ({ message }) => (
 *   <div className="search-detail">
 *     <h3>搜索结果</h3>
 *     <pre>{JSON.stringify(message.detail, null, 2)}</pre>
 *   </div>
 * );
 * 
 * // 注册消息类型
 * import registry from './registry';
 * registry.registerMessageType({
 *   type: 'web_search',
 *   briefRenderer: SearchBrief,
 *   detailRenderer: SearchDetail,
 * });
 * ```
 * 
 * 2. 高级用法 - 支持多种匹配方式
 * ```typescript
 * // 字符串数组匹配 - 多个类型使用同一套渲染组件
 * registry.registerMessageType({
 *   type: ['file_read', 'file_write', 'file_delete'],
 *   briefRenderer: FileOperationBrief,
 *   detailRenderer: FileOperationDetail,
 * });
 * 
 * // 正则表达式匹配 - 动态类型匹配
 * registry.registerMessageType({
 *   type: /^browser_/,
 *   briefRenderer: BrowserToolBrief,
 *   detailRenderer: BrowserToolDetail,
 *   icon: BrowserIcon,
 * });
 * ```
 * 
 * 3. 在容器组件中使用
 * ```typescript
 * // 左侧消息列表渲染
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
 * // 右侧详情区域渲染
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
 * 4. 工具类型特殊处理
 * ```typescript
 * // 工具类型消息需要特殊处理
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
 * 5. 文件组织建议
 * ```
 * src/registry/
 * ├── index.ts                    # 主注册表
 * ├── default/                    # 默认渲染组件
 * ├── text/                       # 文本类型
 * │   ├── index.ts               # 注册逻辑
 * │   ├── TextBriefRenderer.tsx  # 简要渲染
 * │   └── TextDetailRenderer.tsx # 详情渲染
 * ├── web_search/                # 搜索类型
 * │   ├── index.ts
 * │   ├── WebSearchBriefRenderer.tsx
 * │   └── WebSearchDetailRenderer.tsx
 * └── common/                    # 公共组件
 *     ├── icons.tsx
 *     └── MessageBrief.tsx
 * ```
 * 
 * 6. 类型安全的最佳实践
 * ```typescript
 * // 为特定工具类型定义专门的 props 接口
 * interface WebSearchBriefProps extends BriefRendererProps {
 *   message: MessageChunk & { type: 'web_search' };
 * }
 * 
 * const WebSearchBrief: React.FC<WebSearchBriefProps> = ({ message }) => {
 *   // 这里 message 的类型是安全的
 *   return <div>搜索: {message.query}</div>;
 * };
 * ```
 * 
 * 7. 错误处理和调试
 * ```typescript
 * // 检查消息类型是否已注册
 * const isRegistered = (type: string): boolean => {
 *   return !!registry.getMessageType(type);
 * };
 * 
 * // 获取所有已注册的类型
 * const getRegisteredTypes = (): string[] => {
 *   // 注意：这里需要扩展 registry 来支持此功能
 *   return Array.from(registry.stringTypes.keys());
 * };
 * ```
 */
