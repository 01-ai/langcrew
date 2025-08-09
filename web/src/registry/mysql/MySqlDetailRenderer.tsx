import React from 'react';
import { DetailRendererProps } from '..';
import { MessageToolChunk } from '@/types';
import useToolContent from '../common/useToolContent';
import FileContentRender from '@/components/Infra/FileContentRender';
import { Code } from '@/components/Infra';
import { getTranslation } from '@/hooks/useTranslation';

const MySqlDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const content = useToolContent(message as MessageToolChunk);

  return (
    <div className="w-full h-full p-4 flex flex-col" key={message.id}>
      {message.detail?.param?.query && (
        <div className="w-full flex-1 bg-gray-50 rounded-t-lg border border-gray-200">
          <Code language="sql" code={message.detail?.param?.query} isDiff={false} />
        </div>
      )}

      {content && (
        <div className="w-full flex-2 bg-white flex flex-col">
          <div className="flex items-center px-1.5 ">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700">
              {getTranslation('code.interpreter.execution.result')}
            </span>
          </div>
          <div className="flex-1">
            <Code language="plaintext" code={content} isDiff={false} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MySqlDetailRenderer;
