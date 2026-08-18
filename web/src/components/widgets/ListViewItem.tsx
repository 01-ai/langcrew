import React, { PropsWithChildren, useMemo } from 'react';
import Row from './Row';
import { ActionConfig } from './types';
import { useActionExecutor } from '@/hooks/useActionExecutor';

interface ListViewItemProps {
  gap?: number | string;

  align?: 'start' | 'center' | 'end' | 'stretch';

  onClickAction?: ActionConfig;
}

type InteractiveProps = React.HTMLAttributes<HTMLDivElement> & {
  'data-w-clickable'?: string;
};

const ListViewItem: React.FC<PropsWithChildren<ListViewItemProps>> = ({ onClickAction, ...props }) => {
  const { executeAction, isLoading } = useActionExecutor();

  const triggerAction = (event?: React.SyntheticEvent) => {
    if (!onClickAction) return;
    event?.preventDefault();
    event?.stopPropagation();
    event?.persist?.();
    executeAction(onClickAction, { event });
  };

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    triggerAction(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      triggerAction(event);
    }
  };

  const interactiveProps: InteractiveProps | undefined = onClickAction
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        'data-w-clickable': '',
        'aria-busy': isLoading ? true : undefined,
      }
    : undefined;

  return (
    <div {...(interactiveProps ?? {})}>
      <Row component="list-item" {...props} padding={2}>
        {props.children}
      </Row>
    </div>
  );
};

export default ListViewItem;
