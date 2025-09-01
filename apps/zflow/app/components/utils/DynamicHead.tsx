'use client'

import React, { useEffect } from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function DynamicHead() {
  const { t, currentLang } = useTranslation();

  useEffect(() => {
    // Update document title
    document.title = t.meta.appTitle;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t.meta.appDescription);
    }
    
    // Update html lang attribute
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  }, [t.meta.appTitle, t.meta.appDescription, currentLang]);

  return null; // This component doesn't render anything
}