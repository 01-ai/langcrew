import { useCallback, useRef } from 'react';

export interface FormDataCollectorOptions {
  /**
   * Scope selector for data collection
   * @default '.w-widget-scope' - collect form data from the nearest widget scope
   */
  scope?: string;
}

/**
 * Get a nested object value
 */
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return current;
};

/**
 * Set a nested object value
 * Supports dot-notation (e.g. "user.profile.name")
 */
const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const keys = path.split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
};

/**
 * Collect all form data from a DOM element
 * Supports:
 * - Native form elements: input[name], textarea[name], select[name]
 * - Text component editable input
 * - Nested field names via dot-notation (e.g. "user.name" -> {user: {name: value}})
 */
export const collectFormData = (container: HTMLElement): Record<string, unknown> => {
  const data: Record<string, unknown> = {};

  // Find form elements with a name
  const formElements = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[name]');

  formElements.forEach((element) => {
    const name = element.getAttribute('name');
    if (!name) return;

    let value: unknown;

    // Read the value by element type
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        // checkbox: collect same-name values as an array
        const existingValue = getNestedValue(data, name);
        if (element.checked) {
          if (existingValue === undefined) {
            value = element.value || true;
          } else if (Array.isArray(existingValue)) {
            existingValue.push(element.value || true);
            return; // Already handled
          } else {
            value = [existingValue, element.value || true];
          }
        } else if (existingValue === undefined) {
          return; // Unchecked checkboxes are omitted
        }
      } else if (element.type === 'radio') {
        // radio: collect only the checked one
        if (element.checked) {
          value = element.value;
        } else {
          return; // Unchecked radios are skipped
        }
      } else {
        value = element.value;
      }
    } else if (element instanceof HTMLTextAreaElement) {
      value = element.value;
    } else if (element instanceof HTMLSelectElement) {
      if (element.multiple) {
        // Multi-select
        value = Array.from(element.selectedOptions).map((opt) => opt.value);
      } else {
        value = element.value;
      }
    }

    // Nested fields via dot-notation (e.g. "user.name")
    setNestedValue(data, name, value);
  });

  return data;
};

/**
 * Hook: collect form data
 */
export const useFormDataCollector = (options?: FormDataCollectorOptions) => {
  const scopeRef = useRef<string>(options?.scope || '.w-widget-scope');

  /**
   * Collect form data from an element or the nearest widget scope
   */
  const collectData = useCallback((triggerElement?: HTMLElement | null): Record<string, unknown> => {
    // If no trigger element, collect from the current document
    if (!triggerElement) {
      const scope = document.querySelector(scopeRef.current);
      return scope instanceof HTMLElement ? collectFormData(scope) : {};
    }

    // Find the nearest widget scope
    const scope = triggerElement.closest(scopeRef.current);
    if (scope instanceof HTMLElement) {
      return collectFormData(scope);
    }

    return {};
  }, []);

  return {
    collectData,
  };
};

export default useFormDataCollector;
