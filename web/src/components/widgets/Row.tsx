import React from 'react';
import Box from './Box';
import { StyleableProps } from './types';

/**
 * Row component props - extends StyleableProps with horizontal layout preset
 */
export type RowProps = StyleableProps;

/**
 * Row Component - Horizontal flex layout container
 *
 * A convenience component that renders a Box with horizontal (row) direction.
 * Perfect for creating horizontal layouts, navigation bars, toolbars, or inline content arrangements.
 *
 * Creates a flexbox container with flex-direction set to row, allowing you to
 * arrange children horizontally with consistent spacing and alignment control.
 *
 * Layout Properties:
 * - gap: Space between direct children (rem units or CSS string)
 * - padding: Inner padding (rem units, CSS string, or padding object)
 * - align: Cross-axis alignment - 'start', 'center', 'end', 'stretch'
 * - justify: Main-axis distribution - 'start', 'center', 'end', 'between', 'around'
 * - wrap: Flex wrap behavior - 'nowrap', 'wrap', 'wrap-reverse'
 *
 * Size Properties:
 * - width: Explicit width (pixels or CSS string)
 * - height: Explicit height (pixels or CSS string)
 * - minWidth, maxWidth: Width constraints (pixels)
 * - minHeight, maxHeight: Height constraints (pixels)
 *
 * Style Properties:
 * - background: Background color token or CSS color
 * - radius: Border radius preset - 'xs', 'sm', 'md', 'lg', 'xl', 'full'
 * - flex: Flex growth/shrink factor
 *
 * HTML Properties:
 * - children: Child components to render
 * - className: Additional CSS class names
 * - style: Inline CSS styles
 *
 * @example
 * Horizontal layout with three items centered:
 * <Row gap={2} align="center">
 *   <Text value="One" />
 *   <Text value="Two" />
 *   <Text value="Three" />
 * </Row>
 *
 * @example
 * Row with space-between distribution and background:
 * <Row justify="between" padding={4} background="surface-tertiary" radius="md">
 *   {children}
 * </Row>
 *
 * @example
 * Navigation bar with items spaced apart:
 * <Row justify="between" align="center" padding={3} gap={4}>
 *   {navItems}
 * </Row>
 *
 * @example
 * JSON configuration for horizontal layout:
 * {
 *   "type": "Row",
 *   "gap": 2,
 *   "align": "center",
 *   "justify": "between",
 *   "children": [
 *     { "type": "Text", "value": "One" },
 *     { "type": "Text", "value": "Two" },
 *     { "type": "Text", "value": "Three" }
 *   ]
 * }
 */
export const Row: React.FC<RowProps> = (props) => {
  return <Box {...props} component="row" direction="row" />;
};

export default Row;
