import React from 'react';
import { Alert } from 'antd';
import { BriefRendererProps } from '..';
import { useTranslation } from '@/hooks/useTranslation';

const ErrorBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  const { t } = useTranslation();
  return <Alert title={message.content || t('error.generic')} type="error" style={{ marginBottom: 8 }} />;
};

export default ErrorBriefRenderer;
