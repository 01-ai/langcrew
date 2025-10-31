import React from 'react';
import { DetailRendererProps } from '..';
import { getTranslation } from '@/hooks/useTranslation';
import InputOutputDetailRenderer from '@/components/Infra/InputOutputDetailRenderer';

const CodeInterpreterDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const input = message.detail?.param?.code;
  const inputLanguage = message.detail?.param?.language || 'python';
  const output = message.detail?.result?.content || getTranslation('code.interpreter.execution.result.placeholder');
  const outputLanguage = message.detail?.result?.content_type || 'plaintext';

  return (
    <InputOutputDetailRenderer
      input={input}
      inputLanguage={inputLanguage}
      output={output}
      outputLanguage={outputLanguage}
      outputLabel={getTranslation('code.interpreter.execution.result')}
    />
  );
};

export default CodeInterpreterDetailRenderer;
