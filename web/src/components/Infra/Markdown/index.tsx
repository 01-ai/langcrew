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

  //以$开头，非英文字母结尾,中间全是数字的字符串，识别为美元符号
  const escapeDollarNumber = (text: string) => {
    return text?.replace(/(\$\d+[^a-zA-Z])/g, '\\$1');
  };

  const escapeBrackets = (text: string) => {
    // 处理代码块和数学公式
    const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
    let result = text.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock;
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket}$`;
      }
      return match;
    });

    // 处理 URL 后面的标点符号问题
    // 在 URL 后面添加空格来防止标点符号被包含在链接中
    result = result.replace(
      /(https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+)/g,
      '$1 ',
    );

    return result;
  };

  const escapedContent = useMemo(() => {
    return transformContent(escapeBrackets(escapeDollarNumber(content)));
  }, [content]);

  return (
    <div
      className={classNames({
        'message-content-text': true,
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
          //RehypeSanitize：防止脚本注入，默认使用github.com工作方式。参考：https://github.com/rehypejs/rehype-sanitize
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
