import { useCallback, useRef } from 'react';

export interface FormDataCollectorOptions {
  /**
   * Data collection role field selectioner
   * @default '.w-widget-scope' - Collection of Recent widget Form data in the field
   */
  scope?: string;
}

/**
 * Fetch values in embedded objects
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
 * Set values in embedded objects
 * Support dot-notation（Like "user.profile.name"）
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
 * From DOM Collect all form data in the element
 * Support:
 * - input[name], textarea[name], select[name] Like raw table unit
 * - Text Component editable input
 * - Support dot-notation , and then click the "user.name" -> {user: {name: value}}）
 */
export const collectFormData = (container: HTMLElement): Record<string, unknown> => {
  const data: Record<string, unknown> = {};

  // Find All Belts name Table unit of the property
  const formElements = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[name]');

  formElements.forEach((element) => {
    const name = element.getAttribute('name');
    if (!name) return;

    let value: unknown;

    // Acquisition values by type of element
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        // Processing checkbox - If there are multiple names, collect the numbers.
        const existingValue = getNestedValue(data, name);
        if (element.checked) {
          if (existingValue === undefined) {
            value = element.value || true;
          } else if (Array.isArray(existingValue)) {
            existingValue.push(element.value || true);
            return; // It's been processed. Go straight back.
          } else {
            value = [existingValue, element.value || true];
          }
        } else if (existingValue === undefined) {
          return; // Unselected checkbox Do not add to data
        }
      } else if (element.type === 'radio') {
        // Processing radio - Only collect selected
        if (element.checked) {
          value = element.value;
        } else {
          return; // Unselected radio Do Not Process
        }
      } else {
        value = element.value;
      }
    } else if (element instanceof HTMLTextAreaElement) {
      value = element.value;
    } else if (element instanceof HTMLSelectElement) {
      if (element.multiple) {
        // Multiple Selections select
        value = Array.from(element.selectedOptions).map((opt) => opt.value);
      } else {
        value = element.value;
      }
    }

    // Support dot-notation Embedded field (e. g.) "user.name"）
    setNestedValue(data, name, value);
  });

  return data;
};

/**
 * Hook: Provide form data collection functionality
 */
export const useFormDataCollector = (options?: FormDataCollectorOptions) => {
  const scopeRef = useRef<string>(options?.scope || '.w-widget-scope');

  /**
   * From specified element or nearest widget Field Collection Form Data
   */
  const collectData = useCallback((triggerElement?: HTMLElement | null): Record<string, unknown> => {
    // If no trigger element is provided, try to collect from the current document
    if (!triggerElement) {
      const scope = document.querySelector(scopeRef.current);
      return scope instanceof HTMLElement ? collectFormData(scope) : {};
    }

    // Find Recent widget Scope
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
