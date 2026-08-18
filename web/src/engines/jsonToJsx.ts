import React, { createElement, isValidElement } from 'react';
import * as Babel from '@babel/standalone';

// Layout components
import Box from '@/components/widgets/Box';
import Row from '@/components/widgets/Row';
import Col from '@/components/widgets/Col';
import Card from '@/components/widgets/Card';

// Text components
import Text from '@/components/widgets/Text';
import Title from '@/components/widgets/Title';
import Caption from '@/components/widgets/Caption';
import Label from '@/components/widgets/Label';

// Media components
import Image from '@/components/widgets/Image';
import Icon from '@/components/widgets/Icon';

// Form components
import Button from '@/components/widgets/Button';
import DatePicker from '@/components/widgets/DatePicker';
import Select from '@/components/widgets/Select';
import Checkbox from '@/components/widgets/Checkbox';
import RadioGroup from '@/components/widgets/RadioGroup';
import Input from '@/components/widgets/Input';
import Textarea from '@/components/widgets/Textarea';
import Form from '@/components/widgets/Form';

// Content components
import Markdown from '@/components/widgets/Markdown';

// Data visualization components
import Chart from '@/components/widgets/Chart';

// Utility components
import Spacer from '@/components/widgets/Spacer';
import Divider from '@/components/widgets/Divider';
import Badge from '@/components/widgets/Badge';
import { JsxJson } from '@/types';
import ListView from '@/components/widgets/ListView';

import '@/components/widgets/widgets.css';
import ListViewItem from '@/components/widgets/ListViewItem';
import Transition from '@/components/widgets/Transition';

/**
 * Component map for registering custom components
 * Automatically includes all widget components
 *
 * IMPORTANT: This map must include all ComponentType values from types/widget.ts
 * If you add a new component:
 * 1. Export it from widgets/index.ts
 * 2. Add it to ComponentType union in types/widget.ts
 * 3. Import and add it to this componentMap
 */
const componentMap: Record<string, React.ComponentType<any>> = {
  // Layout components
  Card,
  Box,
  Row,
  Col,

  // Text components
  Text,
  Title,
  Caption,
  Label,

  // Media components
  Image,
  Icon,

  // Form components
  Button,
  DatePicker,
  Select,
  Checkbox,
  RadioGroup,
  Input,
  Textarea,
  Form,

  // Content components
  Markdown,

  // Data visualization components
  Chart,

  // Utility components
  Spacer,
  Divider,
  Badge,
  ListView,
  ListViewItem,

  Transition,
};

/**
 * Convert JSON widget data to React element
 * Supports both direct widget data and wrapped format
 */
export function jsonToJsx(
  data: JsxJson,
  customComponents: Record<string, React.ComponentType<any>> = {},
  root = true,
): React.ReactElement | null {
  if (!data || !data.type) {
    return null;
  }

  const component = data;

  // Merge custom components with default component map
  const components = {
    ...componentMap,
    ...customComponents,
  };

  const ComponentType = components[component.type];

  if (!ComponentType) {
    console.warn(`Component type "${component.type}" not found`);
    return null;
  }

  // Extract children and render them recursively
  const children = component.children?.map((child: JsxJson) => jsonToJsx(child, components, false)) || null;

  // Build props from component properties
  const props: any = { ...component };
  delete props.children;
  delete props.type;

  // Add w-widget-scope class to root element
  const baseClassName = props.className || '';
  if (root) {
    props.className = baseClassName ? `${baseClassName} w-widget-scope` : 'w-widget-scope';
  }

  // Handle text content
  if (component.type === 'Text' || component.type === 'Title') {
    return createElement(ComponentType, { ...props }, (component as any).value || children);
  }

  // Handle container components
  return createElement(ComponentType, { ...props }, children);
}

/**
 * Convert JSX string to React element
 * Supports all widget components by default, can inject custom components and data
 * @param {string} jsxStr - JSX string
 * @param {Record<string, any>} data - optional variables for JSX
 * @param {Record<string, React.ComponentType>} customComponents - optional component map
 * @returns {React.ReactElement}
 */
export function jsxStringToJsx(
  jsxStr: string,
  data?: Record<string, any>,
  customComponents?: Record<string, React.ComponentType<any>>,
  root = true,
): React.ReactElement | null {
  try {
    // Merge custom components with default component map
    const components = {
      ...componentMap,
      ...(customComponents || {}),
    };

    // 1. compile jsx to js using Babel
    const compiled = Babel.transform(jsxStr, {
      presets: ['react'],
    }).code;

    // 2. inject React + components scope + data
    const argNames = ['React', ...Object.keys(components), ...(data ? Object.keys(data) : [])];
    const argValues = [React, ...Object.values(components), ...(data ? Object.values(data) : [])];

    // 3. execute code and return ReactElement
    const fn = new Function(...argNames, `return ${compiled};`);
    const result = fn(...argValues);

    // 4. Add w-widget-scope class to root element
    if (isValidElement(result)) {
      const baseClassName = (result.props as any)?.className || '';
      const className = root ? (baseClassName ? `${baseClassName} w-widget-scope` : 'w-widget-scope') : baseClassName;
      return React.cloneElement(result, { className } as any);
    }

    return result;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to convert JSX string: ${err.message}`);
  }
}

export default jsonToJsx;
