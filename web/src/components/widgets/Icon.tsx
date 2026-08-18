import React, { useMemo, createElement } from 'react';
import { cn } from '@/lib/utils';
import FallbackIcon from '@/assets/svg/widgets/fallback.svg?react';
import * as LucideIcons from 'lucide-react';
import { buttonIconMap } from './iconMapping';

/**
 * Color configuration object for theme-aware colors
 */
export interface ColorConfig {
  light?: string;
  dark?: string;
}

/**
 * Icon component props
 */
export interface IconProps {
  /**
   * Name of the icon to display (required)
   * Uses the same icon names as ButtonIcon (search, star, check, etc.)
   * Mapped to lucide-react icons
   */
  name: string;

  /**
   * Icon color; accepts a text color token, primitive color token, CSS string, or theme-aware config
   * Text color tokens: prose, primary, emphasis, secondary, tertiary, success, warning, danger
   * @default "prose"
   */
  color?: string | ColorConfig;

  /**
   * Size of the icon
   * @default "md"
   * Options: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

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
  if (!color) return colorTokens.prose;
  if (typeof color === 'string') {
    return colorTokens[color] || color;
  }
  return color.light || colorTokens.prose;
};

/**
 * Size to CSS class mapping for lucide icons
 */
const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl', { size: number; className: string }> = {
  xs: { size: 12, className: 'w-3 h-3' },
  sm: { size: 14, className: 'w-3.5 h-3.5' },
  md: { size: 16, className: 'w-4 h-4' },
  lg: { size: 18, className: 'w-4.5 h-4.5' },
  xl: { size: 20, className: 'w-5 h-5' },
  '2xl': { size: 24, className: 'w-6 h-6' },
  '3xl': { size: 30, className: 'w-7.5 h-7.5' },
};

/**
 * Get lucide icon component by name
 * @param iconName - Icon name in PascalCase (e.g., 'Plus', 'CheckCircle')
 * @returns Icon component or null if not found
 */
function getLucideIcon(iconName: string): React.ComponentType<any> | null {
  const icon = (LucideIcons as Record<string, unknown>)[iconName];
  return (icon as React.ComponentType<any>) || null;
}

/**
 * Icon Component - Visual glyphs for actions and status
 *
 * A flexible icon component that supports:
 * - 70+ icons from lucide-react
 * - Multiple size options (xs to 3xl)
 * - 8 color tokens with customization
 * - Theme-aware color support
 * - Full customization via className and styles
 *
 * @example
 * ```tsx
 * <Icon name="search" size="md" />
 * ```
 *
 * @example
 * ```tsx
 * <Icon
 *   name="star"
 *   color="warning"
 *   size="lg"
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Icon",
 *   "name": "check",
 *   "color": "success",
 *   "size": "lg"
 * }
 * ```
 */
export const Icon: React.FC<IconProps> = ({ name, color = 'prose', size = 'md', className = '', cssStyle }) => {
  const colorValue = getColorValue(color);
  const sizeConfig = sizeClasses[size];

  // Get lucide icon component
  const lucideIcon = useMemo(() => {
    // Try to map using buttonIconMap first
    const mappedName = (buttonIconMap as Record<string, string>)[name];
    const iconName = mappedName || name;
    return getLucideIcon(iconName);
  }, [name]);

  const wrapperClasses = cn('w-icon', sizeConfig.className, className);

  const inlineStyles: React.CSSProperties = {
    ...cssStyle,
    color: colorValue,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  // Fallback when icon is not found
  if (!lucideIcon) {
    return (
      <span
        className={wrapperClasses}
        style={inlineStyles}
        data-w-component="icon"
        data-icon={name}
        title={`Icon not found: ${name}`}
      >
        <FallbackIcon />
      </span>
    );
  }

  return (
    <span className={wrapperClasses} style={inlineStyles} data-w-component="icon" data-icon={name}>
      {createElement(lucideIcon, {
        size: sizeConfig.size,
        strokeWidth: 2,
      })}
    </span>
  );
};

export default Icon;
