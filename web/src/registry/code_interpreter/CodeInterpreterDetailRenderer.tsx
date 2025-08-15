import React from 'react';
import { DetailRendererProps } from '..';
import Code from '@/components/Infra/Code';
import { getTranslation } from '@/hooks/useTranslation';

const CodeInterpreterDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  return (
    <div className="w-full h-full flex flex-col" style={{ height: '70%' }}>
      <div className="w-full h-[70%] bg-gray-50 rounded-t-lg border border-gray-200">
        <Code
          language={message.detail?.param?.language || 'python'}
          code={message.detail?.param?.code}
          isDiff={false}
        />
      </div>

      <div className="w-full h-[30%] bg-white rounded-b-lg border border-gray-200 border-t-0">
        <div className="flex items-center px-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm font-medium text-gray-700">
            {getTranslation('code.interpreter.execution.result')}
          </span>
        </div>
        <Code
          language="plaintext"
          code={message.detail?.result?.content || getTranslation('code.interpreter.execution.result.placeholder')}
          isDiff={false}
        />
      </div>
    </div>
  );
};

export default CodeInterpreterDetailRenderer;
