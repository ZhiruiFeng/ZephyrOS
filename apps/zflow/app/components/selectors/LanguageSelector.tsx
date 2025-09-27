'use client'

import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n';

interface LanguageSelectorProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export default function LanguageSelector({ 
  className = '', 
  showLabel = true,
  compact = false 
}: LanguageSelectorProps) {
  const { t, currentLang, setLanguage } = useTranslation();

  const languages: { value: Language; label: string; nativeLabel: string }[] = [
    { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'zh', label: 'Chinese', nativeLabel: '中文' },
  ];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <select
          value={currentLang}
          onChange={(e) => handleLanguageChange(e.target.value as Language)}
          className="appearance-none bg-transparent border border-gray-300 rounded px-2 py-1 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.nativeLabel}
            </option>
          ))}
        </select>
        <Globe className="w-3 h-3 absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Globe className="w-4 h-4" />
          <span>Language</span>
        </div>
      )}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {languages.map((lang) => (
          <button
            key={lang.value}
            onClick={() => handleLanguageChange(lang.value)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              currentLang === lang.value
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {lang.nativeLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
