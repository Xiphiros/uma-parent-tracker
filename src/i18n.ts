import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Function to dynamically import all JSON files from a language directory
const loadResources = (lang: string) => {
    const resources: { [key: string]: any } = {};
    const modules = import.meta.glob('./locales/**/*.json', { eager: true });
    
    for (const path in modules) {
        if (path.startsWith(`./locales/${lang}/`)) {
            const namespace = path.split('/').pop()?.replace('.json', '');
            if (namespace) {
                resources[namespace] = (modules[path] as any).default;
            }
        }
    }
    return resources;
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        debug: import.meta.env.DEV,
        fallbackLng: 'en',
        supportedLngs: ['en', 'jp'],
        interpolation: {
            escapeValue: false, // React already safes from xss
        },
        resources: {
            en: loadResources('en'),
            jp: loadResources('jp'),
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLngUi', // Use a unique key for UI language
        },
    });

export default i18n;