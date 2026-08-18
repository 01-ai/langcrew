import React, { useMemo, createElement } from 'react';
import { ButtonColor, ControlVariant, ControlSize, ButtonIcon } from '@/types';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { buttonIconMap } from './iconMapping';
import { ActionConfig } from './types';
import { RotateCw } from 'lucide-react';
import { useActionExecutor } from '@/hooks/useActionExecutor';

/**
 * Button component props
 */
export interface ButtonProps {
  /**
   * Configure the button as a submit button for the nearest form
   * @default false
   */
  submit?: boolean;

  /**
   * Text to display inside the button
   * @example label="Submit"
   */
  label?: string;

  /**
   * Action dispatched on click
   * @example onClickAction={{ type: 'submit', payload: { form: 'login' } }}
   */
  onClickAction?: ActionConfig;

  /**
   * Icon shown before the label
   * Can be used without a label to create an icon-only button
   * @example iconStart="plus"
   */
  iconStart?: ButtonIcon;

  /**
   * Optional icon shown after the label
   * @example iconEnd="arrow-right"
   */
  iconEnd?: ButtonIcon;

  /**
   * Convenience preset for button style
   * @example style="primary"
   */
  style?: 'primary' | 'secondary';

  /**
   * Icon size preset
   * @default "md"
   * @example iconSize="lg"
   */
  iconSize?: ControlSize;

  /**
   * Color of the button; accepts a button color token
   * @default "primary"
   * @example color="success"
   */
  color?: ButtonColor;

  /**
   * Visual variant of the button; accepts a control variant token
   * @default "solid"
   * @example variant="outline"
   */
  variant?: ControlVariant;

  /**
   * Controls the overall size of the button
   * Maps to specific height values:
   * 3xs: 22px, 2xs: 24px, xs: 26px, sm: 28px, md: 32px,
   * lg: 36px, xl: 40px, 2xl: 44px, 3xl: 48px
   * @default "lg"
   * @example size="xl"
   */
  size?: ControlSize;

  /**
   * Determines if the button should be a fully rounded pill shape
   * @default true
   * @example pill={false}
   */
  pill?: boolean;

  /**
   * Determines if the button should have matching width and height based on the size
   * @default false
   * @example uniform={true}
   */
  uniform?: boolean;

  /**
   * Extends button to 100% of available width
   * @default false
   * @example block={true}
   */
  block?: boolean;

  /**
   * Disables interactions and applies disabled styles
   * Note: Button is also automatically disabled if onClickAction is not provided (unless submit={true})
   * @default false
   * @example disabled={true}
   */
  disabled?: boolean;

  /**
   * Whether to collect form data
   * @default true - collect form data in the widget scope by default
   */
  collectFormData?: boolean;
}

/**
 * Get lucide icon component by name
 * @param iconName - Icon name in PascalCase (e.g., 'Plus', 'CheckCircle')
 * @returns Icon component or null if not found
 */
function getLucideIcon(iconName: string): React.ComponentType | null {
  const icon = (LucideIcons as Record<string, unknown>)[iconName];
  return (icon as React.ComponentType) || null;
}

/**
 * Map icon sizes to lucide icon size classes
 */
const iconSizeMap: Record<ControlSize, string> = {
  '3xs': 'w-4 h-4',
  '2xs': 'w-4 h-4',
  xs: 'w-4 h-4',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  '2xl': 'w-6 h-6',
  '3xl': 'w-6 h-6',
};

/**
 * Button Component - For triggering actions
 *
 * A versatile button component with configurable colors, variants, sizes, and icons.
 * Supports submit buttons, icon-only buttons, and various visual styles.
 * Icons are provided by lucide-react.
 *
 * @example
 * ```tsx
 * <Button label="Submit" color="primary" variant="solid" />
 * ```
 *
 * @example
 * ```tsx
 * <Button iconStart="plus" uniform pill size="lg" />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Button",
 *   "label": "Click me",
 *   "color": "primary",
 *   "variant": "solid",
 *   "size": "lg"
 * }
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  submit = false,
  label,
  onClickAction,
  iconStart,
  iconEnd,
  style,
  iconSize = 'md',
  color = 'primary',
  variant = 'solid',
  size = 'lg',
  pill = true,
  uniform = false,
  block = false,
  disabled = false,
  collectFormData = true,
}) => {
  const { executeAction, isLoading: actionLoading } = useActionExecutor({ collectFormData, label });
  // Determine button type based on preset style or explicit color/variant

  const buttonVariant = style ? (style === 'primary' ? 'solid' : 'outline') : variant;

  // Auto-disable button if no onClickAction provided and not a submit button
  const isDisabled = disabled || actionLoading || (!submit && !onClickAction);

  // Get icon size class
  const iconSizeClass = iconSizeMap[iconSize];

  // Get lucide icons if provided
  const startIcon = useMemo(() => {
    if (!iconStart) return null;
    const lucideIconName = buttonIconMap[iconStart];
    return getLucideIcon(lucideIconName);
  }, [iconStart]);

  const endIcon = useMemo(() => {
    if (!iconEnd) return null;
    const lucideIconName = buttonIconMap[iconEnd];
    return getLucideIcon(lucideIconName);
  }, [iconEnd]);

  // Handle click action
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    console.log('onClickAction', onClickAction);
    if (onClickAction) {
      // Prevent native submit when a submit button has onClickAction
      // Avoid firing both the button action and form onSubmitAction
      if (submit) {
        e.preventDefault();
      }
      e.persist?.();
      executeAction(onClickAction, { event: e });
    }
  };

  return (
    <button
      type={submit ? 'submit' : 'button'}
      disabled={isDisabled}
      onClick={handleClick}
      data-color={color}
      data-variant={buttonVariant}
      data-size={size}
      {...(pill && { 'data-pill': '' })}
      {...(uniform && { 'data-uniform': '' })}
      data-w-component="button"
      aria-disabled={isDisabled}
      {...(block && { 'data-block': '' })}
      {...(iconSize !== 'md' && { 'data-icon-size': iconSize })}
      tabIndex={isDisabled ? -1 : undefined}
      {...(isDisabled && { 'data-disabled': '' })}
    >
      {!actionLoading && (
        <span className="w-button-inner">
          {startIcon &&
            createElement(startIcon as any, {
              className: cn('w-button-icon w-button-icon-start', iconSizeClass),
              'aria-hidden': 'true',
            })}
          {label && <span>{label}</span>}
          {endIcon &&
            createElement(endIcon as any, {
              className: cn('w-button-icon w-button-icon-end', iconSizeClass),
              'aria-hidden': 'true',
            })}
        </span>
      )}

      {actionLoading && (
        <div
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
          style={{
            zIndex: 1000,
          }}
        >
          <RotateCw className="animate-spin" style={{ color: 'var(--button-text-color)' }} />
        </div>
      )}
    </button>
  );
};

export default Button;
