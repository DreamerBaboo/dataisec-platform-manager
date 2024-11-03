import { useTranslation } from 'react-i18next';

export const useAppTranslation = (namespace?: string | string[]) => {
  const { t, i18n } = useTranslation(namespace);
  
  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage: (lang: string) => i18n.changeLanguage(lang),
    languages: {
      'en': 'English',
      'zh-TW': '繁體中文'
    }
  };
}; 