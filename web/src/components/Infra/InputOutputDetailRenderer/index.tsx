import React from 'react';
import Code from '@/components/Infra/Code';
import { getTranslation } from '@/hooks/useTranslation';

interface InputOutputDetailRendererProps {
  input?: string;
  output?: string;
  inputLabel?: string;
  outputLabel?: string;
  inputLanguage?: string;
  outputLanguage?: string;
  inputHeight?: string;
  outputHeight?: string;
}

const InputOutputDetailRenderer: React.FC<InputOutputDetailRendererProps> = ({
  input = '',
  output = '',
  inputLabel = getTranslation('inputoutput.input.label'),
  outputLabel = getTranslation('inputoutput.output.label'),
  inputLanguage = 'plaintext',
  outputLanguage = 'plaintext',
  inputHeight = '70%',
  outputHeight = '30%',
}) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="w-full bg-gray-50 border border-gray-200" style={{ height: inputHeight }}>
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center px-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700">{inputLabel}</span>
          </div>
          <div className="flex-1">
            <Code language={inputLanguage as any} code={input} isDiff={false} />
          </div>
        </div>
      </div>

      <div className="w-full bg-white border border-gray-200 border-t-0" style={{ height: outputHeight }}>
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center px-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700">{outputLabel}</span>
          </div>
          <div className="flex-1">
            <Code language={outputLanguage as any} code={output} isDiff={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputOutputDetailRenderer;
