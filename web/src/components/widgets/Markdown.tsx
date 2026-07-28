import React from 'react';
import { cn } from '@/lib/utils';
import MarkdownInfra from '@/components/Infra/Markdown';

/**
 * Markdown widget component props
 */
export interface MarkdownProps {
  /**
   * Markdown source string to render (required)
   */
  value: string;

  /**
   * Applies streaming-friendly transitions for incremental updates
   * Important: Once incremental updates are complete, this should be set to false
   * @default false
   */
  streaming?: boolean;

  /**
   * Callback when code is copied from code blocks
   */
  onCopied?: (code: string) => void;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Inline CSS styles
   */
  cssStyle?: React.CSSProperties;
}

/**
 * Markdown Component - Render rich formatted content from markdown
 *
 * A powerful markdown renderer that supports:
 * - GitHub Flavored Markdown (GFM)
 * - Math formulas (KaTeX)
 * - Code syntax highlighting
 * - Images and links
 * - Emoji rendering
 * - HTML content (with sanitization)
 * - Streaming updates
 *
 * @example
 * ```tsx
 * <Markdown value="**Bold** and _italic_ text" />
 * ```
 *
 * @example
 * ```tsx
 * <Markdown
 *   value={markdownContent}
 *   streaming={isStreaming}
 *   onCopied={(code) => console.log('Copied:', code)}
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Markdown",
 *   "value": "# Heading\n\nParagraph with **bold** text.",
 *   "streaming": false
 * }
 * ```
 */
export const Markdown: React.FC<MarkdownProps> = ({ value, streaming = false, onCopied, className = '', cssStyle }) => {
  const wrapperClasses = cn(
    'w-markdown',
    {
      'markdown-streaming': streaming,
    },
    className,
  );

  return (
    <div className={wrapperClasses} style={cssStyle} data-w-component="markdown" data-streaming={streaming}>
      <MarkdownInfra content={value} processing={streaming} onCopied={onCopied} />
    </div>
  );
};

export default Markdown;
