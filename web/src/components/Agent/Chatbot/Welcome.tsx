import { Welcome } from '@ant-design/x';
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const WelcomeContainer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex">
      <Welcome
        variant="borderless"
        title={t('welcome.title')}
        description={t('welcome.description')}
        styles={{
          title: {
            fontSize: '48px',
            fontWeight: 'bold',
          },
          description: {
            fontSize: '26px',
            textAlign: 'center',
          },
        }}
      />
    </div>
  );
};

export default WelcomeContainer;
