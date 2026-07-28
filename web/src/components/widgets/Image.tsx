import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import Box from './Box';

/**
 * Image component props
 * Supports sizing, fitting, framing, and custom styling
 */
export interface ImageProps {
  /**
   * Image URL source (required)
   * @example src="/weather-icon.svg"
   * @example src="https://example.com/image.png"
   */
  src: string;

  /**
   * Alternate text for accessibility
   * Displayed if image fails to load, used by screen readers
   * @default ""
   */
  alt?: string;

  /**
   * Draw a subtle frame around the image
   * @default false
   */
  frame?: boolean;

  /**
   * How the image fits within its container
   * @default "cover"
   * Options: "none" | "cover" | "contain" | "fill" | "scale-down"
   */
  fit?: 'none' | 'cover' | 'contain' | 'fill' | 'scale-down';

  /**
   * Focal position of the image within the container
   * @default "center"
   * Options: "center" | "top" | "bottom" | "left" | "right" | "top left" | "top right" | "bottom left" | "bottom right"
   */
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right';

  /**
   * Flush the image to the edge of its container, removing surrounding padding
   * @default false
   */
  flush?: boolean;

  /**
   * Explicit width; accepts a numeric pixel value or a CSS string
   * @example width={200}
   * @example width="50%"
   */
  width?: number | string;

  /**
   * Explicit height; accepts a numeric pixel value or a CSS string
   * @example height={200}
   * @example height="auto"
   */
  height?: number | string;

  /**
   * Shorthand to set both width and height; accepts a numeric pixel value or a CSS string
   * @example size={240}
   * @example size="50%"
   */
  size?: number | string;

  /**
   * Minimum width constraint; accepts a numeric pixel value or a CSS string
   */
  minWidth?: number | string;

  /**
   * Minimum height constraint; accepts a numeric pixel value or a CSS string
   */
  minHeight?: number | string;

  /**
   * Shorthand to set both minWidth and minHeight; accepts a numeric pixel value or a CSS string
   */
  minSize?: number | string;

  /**
   * Maximum width constraint; accepts a numeric pixel value or a CSS string
   */
  maxWidth?: number | string;

  /**
   * Maximum height constraint; accepts a numeric pixel value or a CSS string
   */
  maxHeight?: number | string;

  /**
   * Shorthand to set both maxWidth and maxHeight; accepts a numeric pixel value or a CSS string
   */
  maxSize?: number | string;

  /**
   * Aspect ratio of the box (e.g., 16/9); accepts a numeric value or a CSS string
   */
  aspectRatio?: number | string;

  /**
   * Border radius token or value
   * Options: "sm" | "md" | "lg" | "full" | "xl" | "2xl" | "2xs" | "xs" | "3xl" | "4xl" | "100%" | "none"
   */
  radius?: 'sm' | 'md' | 'lg' | 'full' | 'xl' | '2xl' | '2xs' | 'xs' | '3xl' | '4xl' | '100%' | 'none';

  /**
   * Outer margin; accepts a spacing unit, a CSS string, or a margin object
   * @example margin={2}
   * @example margin="1rem"
   * @example margin={{ top: 2, bottom: 2 }}
   */
  margin?:
    | number
    | string
    | { top?: number | string; bottom?: number | string; left?: number | string; right?: number | string };

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
 * Convert size value to CSS
 */
const getSizeValue = (value: number | string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return `${value}px`;
  return value;
};

/**
 * Convert margin value to CSS
 */
const getMarginValue = (
  margin:
    | number
    | string
    | { top?: number | string; bottom?: number | string; left?: number | string; right?: number | string }
    | undefined,
): React.CSSProperties => {
  if (!margin) return {};

  if (typeof margin === 'number') {
    const val = `${margin * 0.25}rem`;
    return { marginTop: val, marginBottom: val, marginLeft: val, marginRight: val };
  }

  if (typeof margin === 'string') {
    return { margin };
  }

  const result: React.CSSProperties = {};
  if (margin.top !== undefined)
    result.marginTop = typeof margin.top === 'number' ? `${margin.top * 0.25}rem` : margin.top;
  if (margin.bottom !== undefined)
    result.marginBottom = typeof margin.bottom === 'number' ? `${margin.bottom * 0.25}rem` : margin.bottom;
  if (margin.left !== undefined)
    result.marginLeft = typeof margin.left === 'number' ? `${margin.left * 0.25}rem` : margin.left;
  if (margin.right !== undefined)
    result.marginRight = typeof margin.right === 'number' ? `${margin.right * 0.25}rem` : margin.right;
  return result;
};

/**
 * Border radius token mapping
 */
const radiusTokens: Record<string, string> = {
  '2xs': '0.125rem',
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  '4xl': '2.5rem',
  full: '9999px',
  '100%': '100%',
  none: '0',
};

/**
 * Get border radius value
 */
const getRadiusValue = (radius: string | undefined): string | undefined => {
  if (!radius) return undefined;
  return radiusTokens[radius] || radius;
};

/**
 * Convert object-fit position value
 */
const getPositionValue = (position: string | undefined): string => {
  if (!position) return 'center';
  return position;
};

/**
 * Image Component - Display remote images with optional framing and object-fit
 *
 * A flexible image component that supports:
 * - Multiple fitting modes (cover, contain, fill, etc.)
 * - Focal position control
 * - Optional frame border
 * - Comprehensive sizing constraints
 * - Aspect ratio control
 * - Border radius
 * - Margin control
 *
 * @example
 * ```tsx
 * <Image src="https://example.com/image.png" alt="Description" frame />
 * ```
 *
 * @example
 * ```tsx
 * <Image
 *   src="/photo.jpg"
 *   alt="Photo"
 *   width={300}
 *   height={200}
 *   fit="cover"
 *   position="top"
 *   radius="lg"
 * />
 * ```
 *
 * @example
 * ```json
 * {
 *   "type": "Image",
 *   "src": "https://example.com/blue-chair.png",
 *   "alt": "Blue chair",
 *   "frame": true,
 *   "size": 240,
 *   "fit": "cover",
 *   "position": "center"
 * }
 * ```
 */
export const Image: React.FC<ImageProps> = (props) => {
  const {
    src,
    alt = '',
    frame = false,
    fit = 'cover',
    position = 'center',
    flush = false,
    width,
    height,
    size,
    minWidth,
    minHeight,
    minSize,
    maxWidth,
    maxHeight,
    maxSize,
    aspectRatio,
    radius,
    margin,
    className = '',
    cssStyle,
  } = props;
  const [loaded, setLoaded] = useState(false);

  // Resolve dimensions
  let finalWidth = width;
  let finalHeight = height;

  // Use size shorthand if no explicit dimensions
  if (size !== undefined && !width && !height) {
    finalWidth = size;
    finalHeight = size;
  }

  // Resolve min/max constraints
  let finalMinWidth = minWidth;
  let finalMinHeight = minHeight;
  let finalMaxWidth = maxWidth;
  let finalMaxHeight = maxHeight;

  if (minSize !== undefined && !minWidth && !minHeight) {
    finalMinWidth = minSize;
    finalMinHeight = minSize;
  }

  if (maxSize !== undefined && !maxWidth && !maxHeight) {
    finalMaxWidth = maxSize;
    finalMaxHeight = maxSize;
  }

  const positionValue = getPositionValue(position);
  const radiusValue = getRadiusValue(radius);
  const marginStyles = getMarginValue(margin);

  // Determine if dimensions are set
  const hasWidth = width !== undefined || size !== undefined;
  const hasHeight = height !== undefined || size !== undefined;

  const wrapperClasses = cn(
    {
      'image-frame': frame,
      'image-flush': flush,
      'image-loaded': loaded,
    },
    className,
  );

  const imageStyle: React.CSSProperties = {
    display: 'block',
    width: getSizeValue(finalWidth as number | string) || '100%',
    height: getSizeValue(finalHeight as number | string),
    minWidth: getSizeValue(finalMinWidth as number | string),
    minHeight: getSizeValue(finalMinHeight as number | string),
    maxWidth: getSizeValue(finalMaxWidth as number | string),
    maxHeight: getSizeValue(finalMaxHeight as number | string),
    aspectRatio: typeof aspectRatio === 'number' ? aspectRatio : aspectRatio,
    objectFit: fit,
    objectPosition: positionValue,
    borderRadius: radiusValue,
    ...marginStyles,
    ...cssStyle,
  };

  return (
    <Box component="image" {...props} flex={0}>
      <img src={src} alt={alt} style={imageStyle} onLoad={() => setLoaded(true)} draggable={false} data-loaded="" />
    </Box>
  );
};

export default Image;
