import React from 'react';
import { Alert } from 'antd';
import { BriefRendererProps } from '..';

const ErrorBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  return <Alert message={message.content || 'an error occurred'} type="error" style={{ marginBottom: 8 }} />;
};

export default ErrorBriefRenderer;
