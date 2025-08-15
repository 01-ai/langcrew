import React from 'react';
import classNames from 'classnames';
import { isEmpty } from 'lodash-es';
import { App } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';

interface QuoteInfoItem {
  title: string;
  url: string;
}

interface SupElementProps {
  quoteInfoList?: QuoteInfoItem[];
  children?: React.ReactNode;
}

const SupElement: React.FC<SupElementProps> = ({ quoteInfoList, children }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const childrenValue = Array.isArray(children) ? children[0] : null;
  const childrenStringValue = typeof childrenValue === 'string' ? childrenValue : '';
  const isNumeric = /^\d+$/.test(childrenStringValue);

  const handleSupClick = () => {
    if (isEmpty(quoteInfoList)) return;

    if (isNumeric) {
      const url = quoteInfoList?.[childrenValue - 1]?.url;
      if (url) {
        window.open(url);
      }
    } else {
      message.error(t('url.404'));
    }
  };

  return (
    <span
      className={classNames({
        sup: true,
        'is-number': isNumeric,
      })}
      onClick={handleSupClick}
    >
      {children}
    </span>
  );
};

export default SupElement;
