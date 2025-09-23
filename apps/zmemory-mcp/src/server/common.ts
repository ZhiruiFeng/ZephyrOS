import { Locale, detectLocaleFromArgs, t } from '../i18n.js';

export function resolveLocale(localeSetting: Locale, args: any): Exclude<Locale, 'auto'> {
  if (localeSetting === 'auto') return detectLocaleFromArgs(args, 'en');
  return (localeSetting === 'en' || localeSetting === 'zh') ? localeSetting : 'en';
}

export function L(locale: Exclude<Locale, 'auto'>, en: string, zh: string): string {
  return locale === 'zh' ? zh : en;
}

export function formatError(error: any, locale: Exclude<Locale, 'auto'>): string {
  if (error?.name === 'OAuthError') {
    return `${t(locale, 'errors.prefix')}: ${t(locale, 'errors.oauth')}`;
  }
  if (error?.name === 'ZMemoryError') {
    const msg = error?.message || t(locale, 'errors.zmemory');
    return `${t(locale, 'errors.prefix')}: ${msg}`;
  }
  const msg = error?.message || t(locale, 'errors.unknown');
  return `${t(locale, 'errors.prefix')}: ${msg}`;
}

export type { Locale };