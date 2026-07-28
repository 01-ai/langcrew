import { useState, useEffect, useCallback, useMemo } from 'react';
import { resources } from '@/config/resources';

// Defines the configured language (with corresponding) JSON (language of the document)
const CONFIGURED_LANGUAGES = ['zh', 'en', 'ru', 'kk'] as const;

// Define Default fallback Languages
const DEFAULT_LANGUAGE = 'en';

/**
 * Standardized language code
 * Convert common language code variants to standard format
 */
const normalizeLangCode = (lang: string): string => {
  const lowerLang = lang.toLowerCase();

  // Deal with common variants
  const mapping: Record<string, string> = {
    'zh-cn': 'zh',
    'zh-tw': 'zh',
    'zh-hk': 'zh',
    'en-us': 'en',
    'en-gb': 'en',
    'ru-ru': 'ru',
    'kk-kz': 'kk',
    'ja-jp': 'ja',
    'ko-kr': 'ko',
    'es-es': 'es',
    'fr-fr': 'fr',
    'de-de': 'de',
  };

  return mapping[lowerLang] || lang;
};

/**
 * tool function to change language setting
 * @param lang new language code
 */
export const changeLanguage = (lang: string) => {
  const normalizedLang = normalizeLangCode(lang);
  localStorage.setItem('i18nextLng', normalizedLang);

  // If the language package does not exist, give a hint
  if (!resources[normalizedLang]) {
    console.info(`Language "${normalizedLang}" will use English (${DEFAULT_LANGUAGE}) as fallback.`);
  }

  // trigger custom event to notify all useTranslation Hook instances
  window.dispatchEvent(new CustomEvent('languageChanged'));
};

export interface UseTranslationReturn {
  t: (key: string, options?: Record<string, string | number | boolean>) => string;
  language: string;
}

/**
 * custom useTranslation Hook
 * when used in a component, need to replace:
 * import { useTranslation } from 'react-i18next';
 * replace with:
 * import { useTranslation } from '@/hooks/useTranslation';
 */
const useTranslation = (): UseTranslationReturn => {
  // cache current language, avoid accessing localStorage every time
  const [language, setLanguage] = useState<string>(() => {
    return getLanguage();
  });

  // listen to localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'i18nextLng' && e.newValue) {
        setLanguage(e.newValue);
      }
    };

    // listen to localStorage changes in the same window
    const handleLocalStorageChange = () => {
      const newLang = getLanguage();
      if (newLang !== language) {
        setLanguage(newLang);
      }
    };

    // listen to localStorage changes in different windows
    window.addEventListener('storage', handleStorageChange);

    // listen to custom events (for changes in the same window)
    window.addEventListener('languageChanged', handleLocalStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChanged', handleLocalStorageChange);
    };
  }, [language]);

  // cache current language pack with fallback to English
  const currentLangPack = useMemo(() => {
    // First try to get a user-selected language package
    const langPack = resources[language];

    // If the language package exists, go straight back.
    if (langPack) {
      return langPack;
    }

    // If not,fallback To English
    console.warn(`Language pack for "${language}" not found, falling back to "${DEFAULT_LANGUAGE}"`);
    return resources[DEFAULT_LANGUAGE] || {};
  }, [language]);

  // use useCallback to cache t function, avoid re-creating every time
  const t = useCallback(
    (key: string, options?: Record<string, string | number | boolean>): string => {
      let message = currentLangPack[key] || key;

      // Replace template variables if options are provided
      if (options) {
        Object.entries(options).forEach(([placeholder, value]) => {
          const regex = new RegExp(`{{${placeholder}}}`, 'g');
          message = message.replace(regex, String(value));
        });
      }

      return message;
    },
    [currentLangPack],
  );

  // use useMemo to cache the returned object, avoid re-creating every time
  return useMemo(
    () => ({
      t,
      language,
    }),
    [t, language],
  );
};

export const getTranslation = (key: string, options?: Record<string, string | number | boolean>): string => {
  const language = getLanguage();

  // Try to get translation in the specified language, if not available, in English fallback
  const langPack = resources[language] || resources[DEFAULT_LANGUAGE] || {};
  let message = langPack[key] || key;

  // Replace template variables if options are provided
  if (options) {
    Object.entries(options).forEach(([placeholder, value]) => {
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      message = message.replace(regex, String(value));
    });
  }

  return message;
};

/**
 * get current language
 * check if the value is valid
 * if valid, return it
 * otherwise return the default value, and set the default value to localStorage
 * @returns current language code (string)
 */
export const getLanguage = (): string => {
  const langInStorage = localStorage.getItem('i18nextLng');

  // If localStorage Value
  if (langInStorage) {
    // Standardized handling of common non-standard values
    const normalizedLang = normalizeLangCode(langInStorage);

    // Update if the standardized value differs from the original value localStorage
    if (normalizedLang !== langInStorage) {
      localStorage.setItem('i18nextLng', normalizedLang);
    }

    return normalizedLang;
  }

  // If settings are not available, use default language
  localStorage.setItem('i18nextLng', DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
};

export { useTranslation };
