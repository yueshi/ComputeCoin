import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhTranslations from './locales/zh.json'
import enTranslations from './locales/en.json'

const resources = {
  zh: {
    translation: zhTranslations
  },
  en: {
    translation: enTranslations
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}'
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      // 优先检查浏览器语言，支持中文和英文
      checkWhitelist: ['zh', 'en'],
      // 如果检测到中文变体，统一转换为zh
      convertDetectedLanguage: (lng) => {
        if (lng.startsWith('zh')) return 'zh'
        if (lng.startsWith('en')) return 'en'
        return lng
      }
    },
    
    react: {
      useSuspense: false,
      // 确保语言切换时组件重新渲染
      bindI18n: 'languageChanged',
      bindI18nStore: 'added removed'
    }
  })

export default i18n