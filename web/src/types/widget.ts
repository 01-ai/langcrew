/**
 * Widget System Type Definitions
 * Comprehensive types for JSON-to-JSX widget rendering
 */


/**
 * Text weight options
 */
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

/**
 * Text size options
 */
export type TextSize = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl';

/**
 * Text color semantic values
 * - Text color tokens: prose, primary, emphasis, secondary, tertiary, success, warning, danger
 * - Primitive color token: e.g. red-100, blue-900, gray-500
 * - CSS color: e.g. blue, #112233, rgb(1,2,3)
 */
export type TextColor = 'prose' | 'primary' | 'emphasis' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger';

/**
 * Background color values
 * Can be:
 * - Predefined color tokens: 'surface-tertiary', 'surface-elevated'
 * - CSS gradients: 'linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)'
 * - CSS colors: 'blue', '#fff', 'rgb(255, 0, 0)'
 */
export type BackgroundColor = 'surface-tertiary' | 'surface-elevated' | string;

/**
 * Border radius values
 */
// export type BorderRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type BorderRadius = 'sm' | 'md' | 'lg' | 'full' | 'xl' | '2xl' | '2xs' | 'xs' | '3xl' | '4xl' | '100%' | 'none';

/**
 * Alignment values
 */
export type AlignValue = 'start' | 'center' | 'end' | 'stretch' | 'between' | 'around';

/**
 * Justify values
 */
export type JustifyValue = 'start' | 'center' | 'end' | 'between' | 'around';

/**
 * Flex direction
 */
export type FlexDirection = 'row' | 'col';

/**
 * Object fit options for images
 */
export type ObjectFit = 'contain' | 'cover' | 'fill' | 'scale-down';

/**
 * Flex value shorthand
 */
export type FlexValue = '0 0 auto' | '1 1 0%' | string;

/**
 * Button color options
 */
export type ButtonColor = 'info' | 'primary' | 'secondary' | 'discovery' | 'success' | 'caution' | 'warning' | 'danger';

/**
 * Control variant options
 */
export type ControlVariant = 'solid' | 'soft' | 'outline' | 'ghost';

/**
 * Control size options
 */
export type ControlSize = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Button icon options
 */
export type ButtonIcon =
  | 'agent'
  | 'analytics'
  | 'atom'
  | 'batch'
  | 'bolt'
  | 'book-open'
  | 'book-closed'
  | 'book-clock'
  | 'bug'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'check-circle'
  | 'check-circle-filled'
  | 'chevron-left'
  | 'chevron-right'
  | 'circle-question'
  | 'compass'
  | 'confetti'
  | 'cube'
  | 'desktop'
  | 'document'
  | 'dot'
  | 'dots-horizontal'
  | 'dots-vertical'
  | 'empty-circle'
  | 'external-link'
  | 'globe'
  | 'keys'
  | 'lab'
  | 'images'
  | 'info'
  | 'lifesaver'
  | 'lightbulb'
  | 'mail'
  | 'map-pin'
  | 'maps'
  | 'mobile'
  | 'name'
  | 'notebook'
  | 'notebook-pencil'
  | 'page-blank'
  | 'phone'
  | 'play'
  | 'plus'
  | 'profile'
  | 'profile-card'
  | 'reload'
  | 'star'
  | 'star-filled'
  | 'search'
  | 'sparkle'
  | 'sparkle-double'
  | 'square-code'
  | 'square-image'
  | 'square-text'
  | 'suitcase'
  | 'settings-slider'
  | 'user'
  | 'wreath'
  | 'write'
  | 'write-alt'
  | 'write-alt2';

/**
 * Base layout attributes shared by multiple components
 */
export interface LayoutAttributes {
  gap?: number;
  padding?: number;
  align?: AlignValue;
  justify?: JustifyValue;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  margin?: Record<string, number>;
  radius?: BorderRadius;
  background?: BackgroundColor;
  flex?: FlexValue;
  direction?: FlexDirection;
  wrap?: 'wrap' | 'nowrap';
}

/**
 * Text component properties
 */
export interface TextComponentProps extends LayoutAttributes {
  type: 'Text';
  value: string;
  weight?: TextWeight;
  size?: TextSize;
  color?: TextColor | string;
}

/**
 * Title component properties
 */
export interface TitleComponentProps extends LayoutAttributes {
  type: 'Title';
  value: string;
  weight?: TextWeight;
  size?: TextSize;
  color?: TextColor | string;
}

/**
 * Image component properties
 */
export interface ImageComponentProps extends LayoutAttributes {
  type: 'Image';
  src: string;
  alt: string;
  fit?: ObjectFit;
  size?: number;
}

/**
 * Button component properties
 */
export interface ButtonComponentProps extends LayoutAttributes {
  type: 'Button';
  label?: string;
  submit?: boolean;
  onClickAction?: { type: string; payload?: unknown };
  iconStart?: ButtonIcon;
  iconEnd?: ButtonIcon;
  style?: 'primary' | 'secondary';
  iconSize?: ControlSize;
  color?: ButtonColor;
  variant?: ControlVariant;
  size?: ControlSize;
  pill?: boolean;
  uniform?: boolean;
  block?: boolean;
  disabled?: boolean;
}

/**
 * DatePicker component properties
 */
export interface DatePickerComponentProps extends LayoutAttributes {
  type: 'DatePicker';
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Select component properties
 */
export interface SelectComponentProps extends LayoutAttributes {
  type: 'Select';
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Checkbox component properties
 */
export interface CheckboxComponentProps extends LayoutAttributes {
  type: 'Checkbox';
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * RadioGroup component properties
 */
export interface RadioGroupComponentProps extends LayoutAttributes {
  type: 'RadioGroup';
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Input component properties
 */
export interface InputComponentProps extends LayoutAttributes {
  type: 'Input';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Textarea component properties
 */
export interface TextareaComponentProps extends LayoutAttributes {
  type: 'Textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Container component properties (Box, Row, Col, Card)
 */
export interface ContainerComponentProps extends LayoutAttributes {
  type: 'Box' | 'Row' | 'Col' | 'Card';
  children?: WidgetComponent[];
  key?: string;
}

/**
 * Union type for all widget components
 */
export type WidgetComponent =
  | TextComponentProps
  | TitleComponentProps
  | ImageComponentProps
  | ButtonComponentProps
  | DatePickerComponentProps
  | SelectComponentProps
  | CheckboxComponentProps
  | RadioGroupComponentProps
  | InputComponentProps
  | TextareaComponentProps
  | ContainerComponentProps;

/**
 * Widget data wrapper
 */
export interface WidgetData {
  key?: string;
  id?: string;
  type: string;
  children?: WidgetData[];
}

/**
 * Message detail wrapper from agent
 */
export interface ChatkitMessageDetail {
  type: 'thread.item.done';
  item: {
    id: string;
    thread_id: string;
    created_at: string;
    type: 'widget';
    widget: WidgetData;
  };
}

/**
 * Style mapping for component properties
 */
export interface StyleMap {
  [key: string]: string | number | undefined;
}

/**
 * Component props for React rendering
 */
export interface WidgetComponentProps {
  component: WidgetComponent;
  children?: React.ReactNode;
}
