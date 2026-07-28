import React from 'react';
import { DetailRendererProps } from '..';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { Code, Markdown } from '@/components/Infra';
import { isJsonString } from '@/utils/json';

const DefaultDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { content, contentType } = useToolContent(message as MessageToolChunk);

  if (contentType === 'text/markdown' || contentType === 'markdown') {
    return (
      <div className="w-full h-full overflow-y-auto p-2">
        <Markdown content={content} />
      </div>
    );
  }
  if (contentType.includes('video') || contentType.includes('mp4')) {
    return <video src={content} controls className="w-full h-full" autoPlay muted />;
    // return <VideoPlayer url={content} controls rootClassName="w-full h-full" />;
  }

  const code = (() => {
    // Pretty-print object content.
    if (content && typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    // Parse and pretty-print JSON string content.
    if (content && isJsonString(content)) {
      const json = JSON.parse(content);
      return JSON.stringify(json, null, 2);
    }
    // Fall back to the serialized message detail when content is empty.
    return content || JSON.stringify(message?.detail, null, 2);
  })();

  return <Code code={code} isDiff={false} />;
};;

export default DefaultDetailRenderer;
