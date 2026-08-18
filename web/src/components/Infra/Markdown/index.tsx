import React, { memo, useMemo } from 'react';
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

import PreElement from './components/PreElement';
import ImgElement from './components/ImgElement';
import OlElement from './components/OlElement';
import LiElement from './components/LiElement';
import SectionElement from './components/SectionElement';
import TableElement from './components/TableElement';
import LinkElement from './components/LinkElement';
import CitationElement from './components/CitationElement';
import SupElement from './components/SupElement';
import type { CitationSource } from '@/types';
import { transformCitationSyntax } from '@/features/citation/utils/citation';

import './index.less';

interface MarkdownProps {
  content?: string;
  className?: string;
  processing?: boolean;
  onCopied?: (copy: string) => void;
  citations?: CitationSource[];
  onCitationOpen?: (source: CitationSource | CitationSource[]) => void;
}

const Markdown: React.FC<MarkdownProps> = ({
  content = '',
  className = '',
  processing,
  onCopied,
  citations,
  onCitationOpen,
}) => {
  const transformContent = (content: string) => {
    const pattern = /(\n|^)([-*]|[\d]\.)[^\n]*\n/g;
    const replacement = `$1$&`;
    return content.replace(pattern, replacement);
  };

  // Treat $ + digits (not followed by a letter) as a dollar amount, not math
  const escapeDollarNumber = (text: string) => {
    return text?.replace(/(\$\d+[^a-zA-Z])/g, '\\$1');
  };

  const escapeBrackets = (text: string) => {
    // Handle code blocks and math
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

    // Trailing punctuation after URLs used to be absorbed into the link.
    // The previous regex also inserted extra spaces into filenames such as
    // "2024-2025年一线城市房价变化折线图.png". Leave it commented until a safer pattern exists.
    // Add a trailing space so trailing punctuation is not part of the URL
    // result = result.replace(
    //   /(https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+)/g,
    //   '$1 ',
    // );

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

  const escapedContent = useMemo(() => {
    return transformContent(
      transformCitationSyntax(escapeNonHtmlAngleBrackets(escapeBrackets(escapeDollarNumber(content)))),
    );
  }, [content]);

  if (!content) return null;

  return (
    <div
      className={classNames({
        'markdown-content-text': true,
        [className]: !!className,
      })}
    >
      <ReactMarkdown
        remarkPlugins={[
          [RemarkGfm, { singleTilde: false }],
          RemarkBreaks,
          RemarkEmoji,
          RemarkImages,
          RemarkMath,
          RemarkDirective,
          RemarkDirectiveRehype,
        ]}
        rehypePlugins={[
          RehypeRaw as any,
          // rehype-sanitize: GitHub-style sanitization. https://github.com/rehypejs/rehype-sanitize
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
        ]}
        remarkRehypeOptions={{
          footnoteLabel: 'Sources',
          footnoteLabelTagName: 'div',
          footnoteLabelProperties: {
            className: 'footnote-label',
          },
        }}
        components={{
          pre: (code) => <PreElement {...code} processing={processing} onCopied={onCopied} />,
          img: (code) => <ImgElement {...code} />,
          ol: (code) => <OlElement {...code} />,
          li: (code) => <LiElement {...code} />,
          section: (code) => <SectionElement {...code} />,
          table: (code) => <TableElement {...code} />,
          a: (code) => <LinkElement {...code} />,
          sup: (code) => <SupElement {...code} />,
          citation: (code) => (
            <CitationElement {...code} citations={citations} onOpen={onCitationOpen} />
          ),
        } as any}
      >
        {escapedContent}
      </ReactMarkdown>
    </div>
  );
};

export default memo(Markdown);
