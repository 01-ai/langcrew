import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

const Fallback = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Result
      status="404"
      title={t('fallback.404.title')}
      subTitle={t('fallback.404.subtitle')}
      extra={
        <Button
          type="primary"
          onClick={() => {
            navigate('/home');
          }}
        >
          {t('go.back')}
        </Button>
      }
    />
  );
};

export default Fallback;
