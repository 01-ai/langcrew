import React from 'react';
import './badge.css';

/**
 * Badge component props
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Text to display inside the badge.
   * @example label="Success"
   */
  label: string;
  /**
   * Color of the badge; accepts a badge color token.
   * @default "secondary"
   */
  color?: 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'discovery';
  /**
   * Visual style of the badge.
   * @default "soft"
   */
  variant?: 'solid' | 'soft' | 'outline';
  /**
   * Size of the badge.
   * @default "sm"
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Determines if the badge should be a fully rounded pill shape.
   * @default true
   */
  pill?: boolean;
}

/**
 * Badge Component - Emphasize details with a status indicator.
 *
 * Quickly highlight statuses, metadata, and tags while keeping layouts compact.
 * The badge renders as an inline-flex pill by default and exposes configuration
 * through `color`, `variant`, `size`, and `pill`.
 *
 * Available colors:
 * - `info`, `secondary`, `discovery`, `success`, `warning`, `danger`
 *
 * Available variants:
 * - `soft` (default), `solid`, `outline`
 *
 * Available sizes:
 * - `sm` (default), `md`, `lg`
 *
 * @example
 * ```tsx
 * <Badge label="Success" color="success" size="md" />
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  color = 'secondary',
  variant = 'soft',
  size = 'sm',
  pill = true,
  className,
  ...props
}) => {
  return (
    <div
      className={className}
      data-w-component="badge"
      data-color={color}
      data-variant={variant}
      data-size={size}
      data-pill={pill ? '' : undefined}
      {...props}
    >
      {label}
    </div>
  );
};

export default Badge;
