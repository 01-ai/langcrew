import { useState, useEffect, useCallback, useMemo } from 'react';
import { resources } from '@/config/resources';

/**
 * 更改语言设置的工具函数
 * @param lang 新的语言代码
 */
export const changeLanguage = (lang: string) => {
  localStorage.setItem('i18nextLng', lang);
  // 触发自定义事件通知所有 useTranslation Hook 实例
  window.dispatchEvent(new CustomEvent('languageChanged'));
};



/**
 * 自定义的 useTranslation Hook
 * 在组件中使用时，需要将：
 * import { useTranslation } from 'react-i18next';
 * 替换为：
 * import { useTranslation } from '@/hooks/useTranslation';
 */
const useTranslation = () => {
  // 缓存当前语言，避免每次都访问 localStorage
  const [language, setLanguage] = useState<'zh' | 'en'>(() => {
    return getLanguage();
  });

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'i18nextLng' && e.newValue) {
        setLanguage(e.newValue as 'zh' | 'en');
      }
    };

    // 监听同一窗口内的 localStorage 变化
    const handleLocalStorageChange = () => {
      const newLang = getLanguage();
      if (newLang !== language) {
        setLanguage(newLang);
      }
    };

    // 监听跨窗口的 localStorage 变化
    window.addEventListener('storage', handleStorageChange);

    // 监听自定义事件（用于同一窗口内的变化）
    window.addEventListener('languageChanged', handleLocalStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChanged', handleLocalStorageChange);
    };
  }, [language]);

  // 缓存当前语言包
  const currentLangPack = useMemo(() => {
    return resources[language] || {};
  }, [language]);

  // 使用 useCallback 缓存 t 函数，避免每次渲染都重新创建
  const t = useCallback(
    (key: string) => {
      return currentLangPack[key] || key;
    },
    [currentLangPack],
  );

  // 使用 useMemo 缓存返回对象，避免每次渲染都重新创建
  return useMemo(
    () => ({
      t,
      language,
    }),
    [t, language],
  );
};

export const getTranslation = (key: string) => {
  const language = getLanguage();
  return resources[language][key] || key;
};

/**
 * 获取当前语言
 * 判断值是否合法
 * 如果合法则返回
 * 否则返回默认值，并设置默认值到localStorage
 * @returns 'zh' | 'en'
 */
export const getLanguage = (): 'zh' | 'en' => {
  const langInStorage = localStorage.getItem('i18nextLng');
  if (['zh', 'en'].includes(langInStorage)) {
    return langInStorage as 'zh' | 'en';
  }
  // 兼容非标准值
  if (langInStorage === 'zh-CN') {
    localStorage.setItem('i18nextLng', 'zh');
    return 'zh';
  }
  // 兼容非标准值
  if (langInStorage === 'en-US') {
    localStorage.setItem('i18nextLng', 'en');
    return 'en';
  }
  localStorage.setItem('i18nextLng', 'en');
  return 'en';
};

export { useTranslation };
