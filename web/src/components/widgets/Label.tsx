import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Color configuration object for theme-aware colors
 */
export interface ColorConfig {
  light?: string;
  dark?: string;
}

/**
 * Label component props
 */
export interface LabelProps {
  /**
   * Text content of the label (required)
   */
  value: string;

  /**
   * Name of the field this label describes (required)
   * Used for the 'htmlFor' attribute to associate with form control
   */
  fieldName: string;

  /**
   * Size of the label text
   * @default "sm"
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Font weight
   * @default "medium"
   */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';

  /**
   * Horizontal text alignment
   * @default "start"
   */
  textAlign?: 'start' | 'center' | 'end';

  /**
   * Text color
   * Accepts text color token, primitive color token, CSS string, or theme-aware config
   * Text color tokens: prose, primary, emphasis, secondary, tertiary, success, warning, danger
   * @default "secondary"
   */
  color?: string | ColorConfig;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Inline CSS styles
   */
  cssStyle?: React.CSSProperties;
}

/**
 * Text color token to CSS variable mapping
 */
const colorTokens: Record<string, string> = {
  prose: 'var(--color-text-prose)',
  primary: 'var(--color-text-primary)',
  emphasis: 'var(--color-text-emphasis)',
  secondary: 'var(--color-text-secondary)',
  tertiary: 'var(--color-text-tertiary)',
  success: 'var(--color-text-success)',
  warning: 'var(--color-text-warning)',
  danger: 'var(--color-text-danger)',
};

/**
 * Get color value from token or config
 */
const getColorValue = (color: string | ColorConfig | undefined): string => {
  if (!color) return colorTokens.secondary;
  if (typeof color === 'string') {
    return colorTokens[color] || color;
  }
  // For theme-aware config, return light mode value
  return color.light || colorTokens.secondary;
};

/**
 * Size to CSS class mapping
 */
const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * Weight to CSS class mapping
 */
const weightClasses: Record<'normal' | 'medium' | 'semibold' | 'bold', string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

/**
 * Text alignment to CSS class mapping
 */
const textAlignClasses: Record<'start' | 'center' | 'end', string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

/**
 * Label Component - Accessible label for a form field
 *
 * A semantic label component that properly associates with form controls
 * using the htmlFor attribute for accessibility.
 *
 * @example
 * ```tsx
 * <Label value="Email" fieldName="email" />
 * <Input name="email" />
 * ```
 *
 * @example
 * ```tsx
 * <Label value="Required Field" fieldName="username" weight="semibold" />
 * <Input name="username" />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Label",
 *   "value": "Email",
 *   "fieldName": "email",
 *   "size": "sm",
 *   "weight": "medium"
 * }
 * ```
 */
export const Label: React.FC<LabelProps> = ({
  value,
  fieldName,
  size = 'sm',
  weight = 'medium',
  textAlign = 'start',
  color = 'secondary',
  className = '',
  cssStyle,
}) => {
  const colorValue = getColorValue(color);
  const sizeClass = sizeClasses[size];
  const weightClass = weightClasses[weight];
  const alignClass = textAlignClasses[textAlign];

  const wrapperClasses = cn('w-label', 'inline-block', sizeClass, weightClass, alignClass, className);

  const inlineStyles: React.CSSProperties = {
    ...cssStyle,
    color: colorValue,
  };

  return (
    <label
      className={wrapperClasses}
      htmlFor={fieldName}
      style={inlineStyles}
      data-w-component="label"
      data-size={size}
      data-weight={weight}
    >
      {value}
    </label>
  );
};

export default Label;
