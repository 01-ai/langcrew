import React from 'react';
import { DetailRendererProps } from '..';
import InputOutputDetailRenderer from '@/components/Infra/InputOutputDetailRenderer';

const ClaudeSkillDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const isInputObj = message.detail?.param !== null && typeof message.detail?.param === 'object';
  const input = isInputObj ? JSON.stringify(message.detail?.param, null, 2) : message.detail?.param;

  const output =
    message.detail?.result !== null && typeof message.detail?.result === 'object'
      ? JSON.stringify(message.detail?.result, null, 2)
      : message.detail?.result;
  return <InputOutputDetailRenderer input={input} inputLanguage="json" output={output} outputLanguage="json" />;
};

export default ClaudeSkillDetailRenderer;
