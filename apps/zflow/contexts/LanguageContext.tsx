'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, getCurrentLanguage, setCurrentLanguage, getTranslations, TranslationKeys } from '../lib/i18n';

interface LanguageContextValue {
  currentLang: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  isEnglish: boolean;
  isChinese: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [t, setT] = useState<TranslationKeys>(getTranslations('en'));
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
    const lang = getCurrentLanguage();
    setCurrentLang(lang);
    setT(getTranslations(lang));
  }, []);

  // Listen for language changes from other components
  useEffect(() => {
    if (!isClient) return;

    const handleLanguageChange = (event: CustomEvent<Language>) => {
      setCurrentLang(event.detail);
      setT(getTranslations(event.detail));
    };

    window.addEventListener('languageChange', handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, [isClient]);

  const setLanguage = (lang: Language) => {
    setCurrentLang(lang);
    setT(getTranslations(lang));
    setCurrentLanguage(lang);
  };

  const value: LanguageContextValue = {
    currentLang,
    setLanguage,
    t,
    isEnglish: currentLang === 'en',
    isChinese: currentLang === 'zh',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, currentLang, setLanguage, isEnglish, isChinese } = useLanguage();
  return { t, currentLang, setLanguage, isEnglish, isChinese };
}