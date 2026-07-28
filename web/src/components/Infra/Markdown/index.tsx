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
import SupElement from './components/SupElement';

import './index.less';

interface MarkdownProps {
  content?: string;
  className?: string;
  processing?: boolean;
  onCopied?: (copy: string) => void;
}

const Markdown: React.FC<MarkdownProps> = ({ content = '', className = '', processing, onCopied }) => {
  const transformContent = (content: string) => {
    const pattern = /(\n|^)([-*]|[\d]\.)[^\n]*\n/g;
    const replacement = `$1$&`;
    return content.replace(pattern, replacement);
  };

  //Here.$Start, end of non-English letter,The middle is full of numbers, and it's recognized as a dollar symbol.
  const escapeDollarNumber = (text: string) => {
    return text?.replace(/(\$\d+[^a-zA-Z])/g, '\\$1');
  };

  const escapeBrackets = (text: string) => {
    // Process code blocks and mathematical formulae
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

    // Processing URL The question of the subsequent punt (provisional note, recast re-ordering of the question, which leads to 2024-2025Figure of annual decoupling of urban housing prices.png --> 2024-2025 Figure of annual decoupling of urban housing prices.pngMultiple Spaces)
    // Add a trailing space so punctuation is not included in the URL.
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
    return transformContent(escapeNonHtmlAngleBrackets(escapeBrackets(escapeDollarNumber(content))));
  }, [content]);

  if (!content) return null;

  return (
    <div
      className={classNames({
        'agentx-content-text': true,
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
          //RehypeSanitize：Prevent script injection, default usegithub.comWorking methods.https://github.com/rehypejs/rehype-sanitize
          [
            RehypeSanitize,
            {
              ...defaultSchema,
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
        }}
      >
        {escapedContent}
      </ReactMarkdown>
    </div>
  );
};

export default memo(Markdown);
