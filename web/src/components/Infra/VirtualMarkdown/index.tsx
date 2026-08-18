import React, { memo, useMemo, useState, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import classNames from 'classnames';
import ReactMarkdown from 'react-markdown';
import RemarkGfm from 'remark-gfm';
import RemarkBreaks from 'remark-breaks';
import RemarkEmoji from 'remark-emoji';
import RemarkImages from 'remark-images';
import RemarkMath from 'remark-math';
import RemarkDirective from 'remark-directive';
import RemarkDirectiveRehype from 'remark-directive-rehype';
import RehypeKatex from 'rehype-katex';
import RehypeHighlight from 'rehype-highlight';
import RehypeRaw from 'rehype-raw';
import RehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Spin, Progress } from 'antd';

import PreElement from '../Markdown/components/PreElement';
import ImgElement from '../Markdown/components/ImgElement';
import OlElement from '../Markdown/components/OlElement';
import LiElement from '../Markdown/components/LiElement';
import SectionElement from '../Markdown/components/SectionElement';
import TableElement from '../Markdown/components/TableElement';
import LinkElement from '../Markdown/components/LinkElement';
import CitationElement from '../Markdown/components/CitationElement';

import { MarkdownBlockParser, type MarkdownBlock, getContentStats } from '@/utils/markdownBlockParser';
import { getWorkerManager, isWorkerSupported } from '@/utils/workerManager';
import { useTranslation } from '@/hooks/useTranslation';
import { transformCitationSyntax } from '@/features/citation/utils/citation';

import '../Markdown/index.less';

interface VirtualMarkdownProps {
  content?: string;
  className?: string;
  processing?: boolean;
  onCopied?: (copy: string) => void;
  /**
   * Forced markdown parse strategy
   * When omitted, the strategy is chosen from content size
   */
  parseStrategy?: 'main-thread' | 'worker' | 'stream';
}

/**
 * Virtualized Markdown component
 * Virtualized Markdown renderer for large files
 */
const VirtualMarkdown: React.FC<VirtualMarkdownProps> = ({
  content = '',
  className = '',
  processing,
  onCopied,
  parseStrategy: forcedStrategy,
}) => {
  const [blocks, setBlocks] = useState<MarkdownBlock[]>([]);
  const [isParsing, setIsParsing] = useState(true);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Parse Markdown into blocks
  useEffect(() => {
    if (!content) {
      setBlocks([]);
      setIsParsing(false);
      return;
    }

    let isCancelled = false;

    const parseContent = async () => {
      setIsParsing(true);
      setParseProgress(0);
      setParseError(null);

      try {
        // Choose a parse strategy from content stats
        const stats = getContentStats(content);
        const strategy = forcedStrategy || stats.parseStrategy;

        let parsedBlocks: MarkdownBlock[];

        if (strategy === 'main-thread') {
          // Main-thread parse (1-5MB)
          await new Promise((resolve) => setTimeout(resolve, 0));
          parsedBlocks = MarkdownBlockParser.parse(content);
          if (!isCancelled) {
            setParseProgress(100);
          }
        } else if (strategy === 'worker' && isWorkerSupported()) {
          // Worker parse (5-20MB)
          try {
            const workerManager = getWorkerManager();
            parsedBlocks = await workerManager.parse(content, (progress) => {
              if (!isCancelled) {
                setParseProgress(Math.round(progress * 100));
              }
            });
          } catch (workerError) {
            console.warn('Worker parsing failed, falling back to main thread:', workerError);
            // Fall back to the main thread
            parsedBlocks = MarkdownBlockParser.parse(content);
          }
        } else if (strategy === 'stream' && isWorkerSupported()) {
          // Streaming parse (>20MB)
          try {
            const workerManager = getWorkerManager();
            parsedBlocks = await workerManager.parseInChunks(content, 10000, (progress, currentBlocks) => {
              if (!isCancelled) {
                setParseProgress(Math.round(progress * 100));
                // Show parsed blocks incrementally
                setBlocks([...currentBlocks]);
              }
            });
          } catch (workerError) {
            console.warn('Stream parsing failed, falling back to main thread:', workerError);
            parsedBlocks = MarkdownBlockParser.parse(content);
          }
        } else {
          // Default to main-thread parsing
          parsedBlocks = MarkdownBlockParser.parse(content);
        }

        if (!isCancelled) {
          setBlocks(parsedBlocks);
          setIsParsing(false);
        }
      } catch (error) {
        console.error('Failed to parse markdown:', error);
        if (!isCancelled) {
          setParseError(error instanceof Error ? error.message : t('markdown.parse.failed'));
          // Fall back to a single block when parsing fails
          setBlocks([
            {
              id: 'fallback-0',
              type: 'root',
              content,
              startLine: 0,
              endLine: content.split('\n').length - 1,
            },
          ]);
          setIsParsing(false);
        }
      }
    };

    parseContent();

    return () => {
      isCancelled = true;
    };
  }, [content, forcedStrategy]);

  // Content transforms shared with the original Markdown component
  const transformContent = (text: string) => {
    const pattern = /(\n|^)([-*]|[\d]\.)[^\n]*\n/g;
    const replacement = `$1$&`;
    return text.replace(pattern, replacement);
  };

  const escapeDollarNumber = (text: string) => {
    return text?.replace(/(\$\d+[^a-zA-Z])/g, '\\$1');
  };

  const escapeBrackets = (text: string) => {
    const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
    const result = text.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock;
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket}$`;
      }
      return match;
    });
    return result;
  };

  const escapeNonHtmlAngleBrackets = (text: string) => {
    const htmlTagPattern =
      /^\/?\s*[a-z][a-z0-9-]*(?:\s+[a-zA-Z_:][\w:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?$/;
    const pattern = /(```[\s\S]*?```|`[^`\n]*`)|<([^>\n]+)>/g;

    return text.replace(pattern, (match, codeBlock, angleContent) => {
      if (codeBlock) {
        return codeBlock;
      }

      if (!angleContent) {
        return match;
      }

      const candidate = angleContent.trim();
      if (candidate.startsWith('!') || candidate.startsWith('?') || htmlTagPattern.test(candidate)) {
        return match;
      }

      return `&lt;${angleContent}&gt;`;
    });
  };

  // Markdown component config
  const markdownComponents = useMemo(
    () => ({
      pre: (code: any) => <PreElement {...code} processing={processing} onCopied={onCopied} />,
      img: (code: any) => <ImgElement {...code} />,
      ol: (code: any) => <OlElement {...code} />,
      li: (code: any) => <LiElement {...code} />,
      section: (code: any) => <SectionElement {...code} />,
      table: (code: any) => <TableElement {...code} />,
      a: (code: any) => <LinkElement {...code} />,
      citation: (code: any) => <CitationElement {...code} />,
    }),
    [processing, onCopied],
  );

  const markdownPlugins = useMemo(
    () => ({
      remarkPlugins: [
        [RemarkGfm, { singleTilde: false }] as any,
        RemarkBreaks,
        RemarkEmoji,
        RemarkImages,
        RemarkMath,
        RemarkDirective,
        RemarkDirectiveRehype,
      ],
      rehypePlugins: [
        RehypeRaw as any,
        [
          RehypeSanitize,
          {
            ...defaultSchema,
            tagNames: [...(defaultSchema.tagNames || []), 'citation'],
            attributes: {
              ...defaultSchema.attributes,
              '*': [['className', /^language-./, 'math-inline', 'math-display', 'katex']],
              input: [...(defaultSchema.attributes?.input || []), 'type', 'checked', 'disabled'],
              ol: [...(defaultSchema.attributes?.ol || []), 'start'],
            },
          },
        ],
        RehypeKatex,
        [
          RehypeHighlight,
          {
            ignoreMissing: true,
          },
        ],
      ],
      remarkRehypeOptions: {
        footnoteLabel: 'Sources',
        footnoteLabelTagName: 'div',
        footnoteLabelProperties: {
          className: 'footnote-label',
        },
      },
    }),
    [],
  );

  // Render one block
  const renderBlock = (index: number, block: MarkdownBlock) => {
    const escapedContent = transformContent(
      transformCitationSyntax(
        escapeNonHtmlAngleBrackets(escapeBrackets(escapeDollarNumber(block.content))),
      ),
    );

    return (
      <div
        key={block.id}
        data-block-id={block.id}
        data-block-type={block.type}
        className="virtual-markdown-block"
        style={{
          minHeight: block.estimatedHeight ? `${block.estimatedHeight}px` : undefined,
        }}
      >
        <ReactMarkdown {...markdownPlugins} components={markdownComponents}>
          {escapedContent}
        </ReactMarkdown>
      </div>
    );
  };

  if (!content) return null;

  if (isParsing && blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Spin size="large" />
        <div className="text-gray-600">{t('markdown.parsing')}</div>
        {parseProgress > 0 && <Progress percent={parseProgress} style={{ width: '300px' }} />}
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <div className="mb-2">{t('markdown.parse.failed')}</div>
          <div className="text-sm text-gray-500">{parseError}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames({
        'markdown-content-text': true,
        'virtual-markdown-container': true,
        [className]: !!className,
      })}
      style={{ height: '100%', width: '100%' }}
    >
      <Virtuoso
        data={blocks}
        itemContent={renderBlock}
        overscan={3}
        increaseViewportBy={{ top: 1000, bottom: 1000 }}
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default memo(VirtualMarkdown);
