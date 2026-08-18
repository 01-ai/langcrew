import React, { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import useStyleBuilder from './styleBuilder';
import { ActionConfig, StyleableProps } from './types';
import Box from './Box';
import Button from './Button';
import './card.css';

export interface CardProps extends StyleableProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  confirm?: {
    label: string;
    action: ActionConfig;
  };
  cancel?: {
    label: string;
    action: ActionConfig;
  };
}

/**
 * Card Component - Root container for widgets
 * configurable properties:
 * - size: xs, sm, md, lg, xl
 * - confirm: action button configuration
 * - cancel: cancel button configuration
 * unconfigurable properties:
 * - border radius
 * - border
 * - shadow
 */
export const Card: React.FC<CardProps> = ({
  children,
  size = 'sm',
  className,
  theme,
  padding = 4,
  confirm,
  cancel,
  ...props
}) => {
  // declare card specific class name
  const defaultClassName = cn(['w-card', 'overflow-hidden', 'w-max-full', 'border', className]);

  const styles: React.CSSProperties = {
    borderRadius: 20,
  };

  const { style: cardStyle, className: cardClassName } = useStyleBuilder({
    ...props,
    className: defaultClassName,
    style: styles,
  });

  return (
    <div className={className}>
      <Box
        className={cardClassName}
        style={cardStyle}
        background="surface-elevated"
        theme={theme}
        padding={padding}
        component="card"
        container="card"
        data-size={size}
        direction="col"
      >
        {children}
      </Box>
      {(confirm || cancel) && (
        <Box
          direction="row"
          gap={3}
          align="center"
          className="w-card-action-row"
          style={{
            marginTop: '1rem',
          }}
        >
          {confirm && (
            <Button
              label={confirm.label}
              onClickAction={confirm.action}
              color="primary"
              variant="solid"
              size="lg"
              pill
            />
          )}
          {cancel && (
            <Button
              label={cancel.label}
              onClickAction={cancel.action}
              color="primary"
              variant="outline"
              size="lg"
              pill
              collectFormData={false}
            />
          )}
        </Box>
      )}
    </div>
  );
};

export default Card;
