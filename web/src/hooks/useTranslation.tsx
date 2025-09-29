import { useState, useEffect, useCallback, useMemo } from 'react';
import { resources } from '@/config/resources';

/**
 * tool function to change language setting
 * @param lang new language code
 */
export const changeLanguage = (lang: string) => {
  localStorage.setItem('i18nextLng', lang);
  // trigger custom event to notify all useTranslation Hook instances
  window.dispatchEvent(new CustomEvent('languageChanged'));
};

/**
 * custom useTranslation Hook
 * when used in a component, need to replace:
 * import { useTranslation } from 'react-i18next';
 * replace with:
 * import { useTranslation } from '@/hooks/useTranslation';
 */
const useTranslation = () => {
  // cache current language, avoid accessing localStorage every time
  const [language, setLanguage] = useState<'zh' | 'en'>(() => {
    return getLanguage();
  });

  // listen to localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'i18nextLng' && e.newValue) {
        setLanguage(e.newValue as 'zh' | 'en');
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

  // cache current language pack
  const currentLangPack = useMemo(() => {
    return resources[language] || {};
  }, [language]);

  // use useCallback to cache t function, avoid re-creating every time
  const t = useCallback(
    (key: string, options?: Record<string, any>) => {
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

export const getTranslation = (key: string, options?: Record<string, any>) => {
  const language = getLanguage();
  let message = resources[language][key] || key;

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
 * @returns 'zh' | 'en' | 'ru'
 */
export const getLanguage = (): 'zh' | 'en' => {
  const langInStorage = localStorage.getItem('i18nextLng');
  if (['zh', 'en', 'ru'].includes(langInStorage)) {
    return langInStorage as 'zh' | 'en';
  }
  // compatible with non-standard values
  if (langInStorage === 'zh-CN') {
    localStorage.setItem('i18nextLng', 'zh');
    return 'zh';
  }
  // compatible with non-standard values
  if (langInStorage === 'en-US') {
    localStorage.setItem('i18nextLng', 'en');
    return 'en';
  }
  localStorage.setItem('i18nextLng', 'en');
  return 'en';
};

export { useTranslation };
