import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 導入所有翻譯文件
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enComponents from './locales/en/components.json';
import enDashboard from './locales/en/dashboard.json';
import enErrors from './locales/en/errors.json';
import enImages from './locales/en/images.json';
import enMetrics from './locales/en/metrics.json';
import enMonitoring from './locales/en/monitoring.json';
import enNavigation from './locales/en/navigation.json';
import enSettings from './locales/en/settings.json';
import enUtils from './locales/en/utils.json';
import enValidation from './locales/en/validation.json';
import enPodManagement from './locales/en/podmanagement.json';
import enImageManagement from './locales/en/imagemanagement.json';
import zhAuth from './locales/zh-TW/auth.json';
import zhCommon from './locales/zh-TW/common.json';
import zhComponents from './locales/zh-TW/components.json';
import zhDashboard from './locales/zh-TW/dashboard.json';
import zhErrors from './locales/zh-TW/errors.json';
import zhImages from './locales/zh-TW/images.json';
import zhMetrics from './locales/zh-TW/metrics.json';
import zhMonitoring from './locales/zh-TW/monitoring.json';
import zhNavigation from './locales/zh-TW/navigation.json';
import zhSettings from './locales/zh-TW/settings.json';
import zhUtils from './locales/zh-TW/utils.json';
import zhValidation from './locales/zh-TW/validation.json';
import zhPodManagement from './locales/zh-TW/podmanagement.json';
import zhImageManagement from './locales/zh-TW/imagemanagement.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        auth: enAuth,
        common: enCommon,
        components: enComponents,
        dashboard: enDashboard,
        errors: enErrors,
        images: enImages,
        metrics: enMetrics,
        monitoring: enMonitoring,
        navigation: enNavigation,
        settings: enSettings,
        utils: enUtils,
        validation: enValidation,
        podManagement: enPodManagement,
        imageManagement: enImageManagement
      },
      'zh-TW': {
        auth: zhAuth,
        common: zhCommon,
        components: zhComponents,
        dashboard: zhDashboard,
        errors: zhErrors,
        images: zhImages,
        metrics: zhMetrics,
        monitoring: zhMonitoring,
        navigation: zhNavigation,
        settings: zhSettings,
        utils: zhUtils,
        validation: zhValidation,
        podManagement: zhPodManagement,
        imageManagement: zhImageManagement
      }
    },
    lng: 'zh-TW',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    ns: ['auth', 'common', 'components', 'dashboard', 'errors', 'images', 'metrics', 'monitoring', 'navigation', 'settings', 'utils', 'validation', 'podManagement', 'imageManagement'],
    defaultNS: 'common'
  });

export { i18n };
