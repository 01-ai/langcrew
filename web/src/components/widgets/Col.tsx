import React from 'react';
import Box from './Box';
import { StyleableProps } from './types';

/**
 * Col component props - extends StyleableProps with vertical layout preset
 */
export type ColProps = StyleableProps;

/**
 * Col Component - Vertical flex layout container
 *
 * A convenience component that renders a Box with vertical (column) direction.
 * Perfect for creating vertical stacks, menus, forms, or block-based content arrangements.
 *
 * Creates a flexbox container with flex-direction set to column, allowing you to
 * stack children vertically with consistent spacing and alignment control.
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
 * Vertical stack with title and description:
 * <Col gap={2} align="start">
 *   <Title value="Column title" />
 *   <Text value="Supporting text below the title." />
 * </Col>
 *
 * @example
 * Column with spacing and background:
 * <Col padding={4} gap={3} background="surface-tertiary" radius="md">
 *   {children}
 * </Col>
 *
 * @example
 * Centered column with max-width constraint:
 * <Col align="center" maxWidth={400} gap={2}>
 *   {content}
 * </Col>
 *
 * @example
 * JSON configuration for vertical layout:
 * {
 *   "type": "Col",
 *   "gap": 2,
 *   "padding": 4,
 *   "background": "surface-tertiary",
 *   "children": [
 *     { "type": "Title", "value": "Column title" },
 *     { "type": "Text", "value": "Supporting text" }
 *   ]
 * }
 */
export const Col: React.FC<ColProps> = (props) => {
  return <Box {...props} component="col" direction="col" />;
};

export default Col;
