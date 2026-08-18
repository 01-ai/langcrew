import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { JsxJson } from '@/types';
import { jsonToJsx } from './jsonToJsx';

const sampleWidgetData: JsxJson = {
  key: 'weather',
  type: 'Card',
  children: [
    {
      type: 'Box',
      padding: 5,
      background: 'surface-tertiary',
      children: [
        {
          type: 'Row',
          align: 'center',
          justify: 'between',
          children: [
            {
              type: 'Text',
              value: 'Current conditions',
              weight: 'semibold',
              size: 'lg',
            },
            {
              type: 'Image',
              src: '/weather-icon.svg',
              alt: 'Weather',
              fit: 'contain',
              size: 28,
            },
          ],
        },
      ],
    },
  ],
};

describe('jsonToJsx', () => {
  it('converts the component tree and adds the scope class only on the root', () => {
    const result = jsonToJsx(sampleWidgetData);

    expect(isValidElement(result)).toBe(true);
    expect(result?.props).toMatchObject({ className: 'w-widget-scope' });

    const box = result?.props.children[0];
    expect(isValidElement(box)).toBe(true);
    expect(box.props.className).toBeUndefined();

    const row = box.props.children[0];
    expect(isValidElement(row)).toBe(true);
    expect(row.props.children).toHaveLength(2);
  });

  it('allows custom components to override builtins', () => {
    const CustomText = () => null;
    const result = jsonToJsx(
      { type: 'Text', value: 'Custom content' } as JsxJson,
      { Text: CustomText },
    );

    expect(result?.type).toBe(CustomText);
    expect(result?.props.children).toBe('Custom content');
  });
});
