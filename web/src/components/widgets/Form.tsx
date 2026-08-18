import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ActionConfig } from './types';
import { useActionExecutor } from '@/hooks/useActionExecutor';

/**
 * Padding configuration object
 */
export interface PaddingConfig {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

/**
 * Border configuration object
 */
export interface BorderConfig {
  width?: number;
  color?: string;
  style?: string;
}

/**
 * Margin configuration object
 */
export interface MarginConfig {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

/**
 * Background configuration object
 */
export interface BackgroundConfig {
  light?: string;
  dark?: string;
}

/**
 * Form component props
 */
export interface FormProps {
  /**
   * Child components to render inside the form container
   */
  children: React.ReactNode;

  /**
   * Action dispatched when the form is submitted
   * @example onSubmitAction={{ type: 'submitForm', payload: { formId: 'contact' } }}
   */
  onSubmitAction?: ActionConfig;

  /**
   * Flex direction for laying out form children
   * @default "col"
   */
  direction?: 'row' | 'col';

  /**
   * Cross-axis alignment of children
   */
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';

  /**
   * Main-axis distribution of children
   */
  justify?: 'start' | 'center' | 'end' | 'stretch' | 'between' | 'around' | 'evenly';

  /**
   * Wrap behavior for flex items
   */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';

  /**
   * Flex growth/shrink factor
   */
  flex?: string | number;

  /**
   * Gap between direct children; accepts spacing unit or CSS string
   */
  gap?: string | number;

  /**
   * Inner padding; accepts spacing unit, CSS string, or padding object
   */
  padding?: string | number | PaddingConfig;

  /**
   * Border applied to the container
   */
  border?: number | BorderConfig;

  /**
   * Background color; accepts surface token, primitive color token, or theme-aware config
   */
  background?: string | BackgroundConfig;

  /**
   * Explicit height
   */
  height?: string | number;

  /**
   * Explicit width
   */
  width?: string | number;

  /**
   * Shorthand to set both width and height
   */
  size?: string | number;

  /**
   * Minimum height constraint
   */
  minHeight?: string | number;

  /**
   * Minimum width constraint
   */
  minWidth?: string | number;

  /**
   * Shorthand to set both minWidth and minHeight
   */
  minSize?: string | number;

  /**
   * Maximum height constraint
   */
  maxHeight?: string | number;

  /**
   * Maximum width constraint
   */
  maxWidth?: string | number;

  /**
   * Shorthand to set both maxWidth and maxHeight
   */
  maxSize?: string | number;

  /**
   * Aspect ratio (e.g., 16/9)
   */
  aspectRatio?: string | number;

  /**
   * Border radius token
   */
  radius?: 'sm' | 'md' | 'lg' | 'full' | 'xl' | '2xl' | '2xs' | 'xs' | '3xl' | '4xl' | '100%' | 'none';

  /**
   * Outer margin
   */
  margin?: string | number | MarginConfig;

  /**
   * Callback fired when form is submitted
   */
  onSubmit?: (formData: FormData) => void;

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
 * Helper function to convert spacing unit to CSS value
 */
const getSpacingValue = (value: string | number | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return `${value * 0.25}rem`;
  return value;
};

/**
 * Helper function to convert padding config to CSS
 */
const getPaddingStyles = (padding: string | number | PaddingConfig | undefined): React.CSSProperties => {
  if (!padding) return {};
  if (typeof padding === 'string' || typeof padding === 'number') {
    return { padding: getSpacingValue(padding) };
  }
  return {
    paddingTop: getSpacingValue(padding.top),
    paddingRight: getSpacingValue(padding.right),
    paddingBottom: getSpacingValue(padding.bottom),
    paddingLeft: getSpacingValue(padding.left),
  };
};

/**
 * Helper function to convert border config to CSS
 */
const getBorderStyles = (border: number | BorderConfig | undefined): React.CSSProperties => {
  if (!border) return {};
  if (typeof border === 'number') {
    return { border: `${border}px solid var(--border-color, #e5e7eb)` };
  }
  const width = border.width ?? 1;
  const color = border.color ?? 'var(--border-color, #e5e7eb)';
  const style = border.style ?? 'solid';
  return { border: `${width}px ${style} ${color}` };
};

/**
 * Helper function to convert margin config to CSS
 */
const getMarginStyles = (margin: string | number | MarginConfig | undefined): React.CSSProperties => {
  if (!margin) return {};
  if (typeof margin === 'string' || typeof margin === 'number') {
    return { margin: getSpacingValue(margin) };
  }
  return {
    marginTop: getSpacingValue(margin.top),
    marginRight: getSpacingValue(margin.right),
    marginBottom: getSpacingValue(margin.bottom),
    marginLeft: getSpacingValue(margin.left),
  };
};

/**
 * Helper function to convert background to CSS
 */
const getBackgroundValue = (background: string | BackgroundConfig | undefined): string | undefined => {
  if (!background) return undefined;
  if (typeof background === 'string') return background;
  // For theme-aware config, return light mode value (dark mode handled by CSS)
  return background.light;
};

/**
 * Helper function to convert radius token to CSS
 */
const getRadiusValue = (radius: string | undefined): string | undefined => {
  if (!radius) return undefined;
  const radiusMap: Record<string, string> = {
    '2xs': '0.25rem',
    xs: '0.375rem',
    sm: '0.5rem',
    md: '0.625rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    '4xl': '2rem',
    full: '9999px',
    '100%': '100%',
    none: '0',
  };
  return radiusMap[radius] || radius;
};

/**
 * Form Component - Layout container for form controls
 *
 * A flexible form container component with flexbox layout support and form submission handling.
 * Optimized for organizing form controls with consistent spacing and styling.
 *
 * @example
 * ```tsx
 * <Form gap={2} onSubmitAction={{ type: 'submitForm' }}>
 *   <Input name="email" placeholder="Email" />
 *   <Button label="Submit" submit />
 * </Form>
 * ```
 *
 * @example
 * ```tsx
 * <Form direction="row" gap={1} align="center">
 *   <Input name="search" placeholder="Search..." />
 *   <Button label="Search" submit />
 * </Form>
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Form",
 *   "direction": "col",
 *   "gap": 2,
 *   "padding": 4,
 *   "children": [...]
 * }
 * ```
 */
export const Form: React.FC<FormProps> = ({
  children,
  onSubmitAction,
  direction = 'col',
  align,
  justify,
  wrap,
  flex,
  gap,
  padding,
  border,
  background,
  height,
  width,
  size,
  minHeight,
  minWidth,
  minSize,
  maxHeight,
  maxWidth,
  maxSize,
  aspectRatio,
  radius,
  margin,
  onSubmit,
  className = '',
  cssStyle,
}) => {
  const { executeAction, isLoading: isSubmitting } = useActionExecutor();

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // executeAction owns submit, including data collection
    executeAction(onSubmitAction, { event: e });
  };

  // Build styles
  const flexDirectionClass = direction === 'row' ? 'flex-row' : 'flex-col';
  const alignClass = align
    ? {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        baseline: 'items-baseline',
        stretch: 'items-stretch',
      }[align]
    : '';

  const justifyClass = justify
    ? {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        stretch: 'justify-stretch',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      }[justify]
    : '';

  const wrapClass = wrap
    ? {
        nowrap: 'flex-nowrap',
        wrap: 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse',
      }[wrap]
    : '';

  const radiusClass = radius
    ? {
        '2xs': 'rounded-sm',
        xs: 'rounded-xs',
        sm: 'rounded-sm',
        md: 'rounded',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
        '4xl': 'rounded-4xl',
        full: 'rounded-full',
        '100%': 'rounded-full',
        none: 'rounded-none',
      }[radius]
    : '';

  const wrapperClasses = cn('flex', flexDirectionClass, alignClass, justifyClass, wrapClass, radiusClass, className);

  // Build inline styles
  const inlineStyles: React.CSSProperties = {
    ...getPaddingStyles(padding),
    ...getBorderStyles(border),
    ...getMarginStyles(margin),
    ...cssStyle,
    ...(gap !== undefined && { gap: getSpacingValue(gap) }),
    ...(flex !== undefined && { flex: flex }),
    ...(background && { backgroundColor: getBackgroundValue(background) }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(size && {
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
    }),
    ...(minHeight && { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }),
    ...(minWidth && { minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth }),
    ...(minSize && {
      minWidth: typeof minSize === 'number' ? `${minSize}px` : minSize,
      minHeight: typeof minSize === 'number' ? `${minSize}px` : minSize,
    }),
    ...(maxHeight && { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }),
    ...(maxWidth && { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }),
    ...(maxSize && {
      maxWidth: typeof maxSize === 'number' ? `${maxSize}px` : maxSize,
      maxHeight: typeof maxSize === 'number' ? `${maxSize}px` : maxSize,
    }),
    ...(aspectRatio && { aspectRatio: typeof aspectRatio === 'number' ? `${aspectRatio}` : aspectRatio }),
  };

  return (
    <form
      className={wrapperClasses}
      style={inlineStyles}
      onSubmit={handleSubmit}
      data-w-component="form"
      {...(isSubmitting && { 'data-w-submitting': '' })}
    >
      {children}
    </form>
  );
};

export default Form;
