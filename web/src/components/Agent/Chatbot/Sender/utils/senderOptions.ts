import enTranslations from '@/config/en.json';
import type { SenderOptionConfig } from '@/types';

export const getEnglishLabel = (key: string): string => {
  const menuKey = `menu.${key}`;
  return enTranslations[menuKey] || key;
};

export const getDefaultSelectValue = (config: SenderOptionConfig): string | undefined => {
  if (!config.options?.length) return undefined;
  const hasValidDefault = config.defaultValue && config.options.some((option) => option.value === config.defaultValue);
  return hasValidDefault ? config.defaultValue : config.options[0].value;
};

export const buildSenderSelectPayload = (
  options: SenderOptionConfig[],
  values: Record<string, string>,
): Record<string, string> => {
  return options.reduce<Record<string, string>>((acc, config) => {
    const value = values[config.field];
    if (typeof value === 'string' && value.length > 0) {
      acc[config.field] = value;
    }
    return acc;
  }, {});
};

export const normalizeSenderOptionValues = (
  options: SenderOptionConfig[],
  values: Record<string, string>,
): Record<string, string> => {
  const nextValues = { ...values };
  const validFields = new Set<string>();

  options.forEach((config) => {
    validFields.add(config.field);
    const currentValue = nextValues[config.field];
    const isValidCurrentValue = config.options.some((option) => option.value === currentValue);

    if (!isValidCurrentValue) {
      const defaultValue = getDefaultSelectValue(config);
      if (defaultValue) {
        nextValues[config.field] = defaultValue;
      } else {
        delete nextValues[config.field];
      }
    }
  });

  Object.keys(nextValues).forEach((field) => {
    if (!validFields.has(field)) {
      delete nextValues[field];
    }
  });

  return nextValues;
};
