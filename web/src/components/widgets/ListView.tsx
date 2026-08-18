import React, { PropsWithChildren, useMemo } from 'react';
import Icon from './Icon';
import './listview.css';
import Row from './Row';

interface ListViewProps {
  limit?: number;
  status?: {
    text: string;
    icon: string;
  };
  theme?: 'light' | 'dark' | undefined;
  className?: string;
}

const ListView: React.FC<PropsWithChildren<ListViewProps>> = (props) => {
  const { limit = 4, status, theme, children, className } = props;
  console.log('ListView', props);
  return (
    <div
      data-w-component="list"
      data-limit={limit}
      data-status={status}
      {...(theme && { 'data-theme': theme })}
      className={className}
      style={{ width: 300 }}
    >
      {(status?.text || status?.icon) && (
        <Row padding={2}>
          {status.icon && <Icon name={status.icon} />}
          {status?.text && <div className="text-secondary text-base font-medium">{status.text}</div>}
        </Row>
      )}
      {children}
    </div>
  );
};

export default ListView;
