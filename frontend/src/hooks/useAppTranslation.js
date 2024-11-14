import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useAppTranslation = (namespaces = []) => {
  const { t, i18n } = useTranslation(namespaces);

  const languages = {
    'en': 'English',
    'zh-TW': '繁體中文'
  };

  const changeLanguage = useCallback((lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  }, [i18n]);

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage,
    languages
  };
}; 