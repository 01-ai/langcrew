import { WidgetData } from '@/types';

/**
 * Find a component by component_id in the widget tree
 */
export const findComponentInWidget = (widget: WidgetData, component_id: string): WidgetData | null => {
  for (const child of widget.children) {
    if (child.id === component_id) {
      return child;
    }
    if (child.children) {
      const component = findComponentInWidget(child, component_id);
      if (component) {
        return component;
      }
    }
  }
  return null;
};
