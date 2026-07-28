import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import zh from './zh.json';
import kk from './kk.json';
import ru from './ru.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh',
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          ...en,
        },
      },
      zh: {
        translation: {
          ...zh,
        },
      },
      kk: {
        translation: {
          ...kk,
        },
      },
      ru: {
        translation: {
          ...ru,
        },
      },
    },
  });

export default i18n;
