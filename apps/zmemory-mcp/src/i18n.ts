// Lightweight i18n utilities for server responses and tool descriptions
// Note: This is intentionally minimal and non-intrusive.

export type Locale = 'en' | 'zh' | 'auto';

export function isChineseText(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}

export function detectLocaleFromArgs(args: any, fallback: Locale = 'en'): Exclude<Locale, 'auto'> {
  try {
    if (!args) return fallback as Exclude<Locale, 'auto'>;
    const values: string[] = [];
    const collect = (v: any) => {
      if (v == null) return;
      if (typeof v === 'string') values.push(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (typeof v === 'object') Object.values(v).forEach(collect);
    };
    collect(args);
    const joined = values.join(' ');
    return isChineseText(joined) ? 'zh' : 'en';
  } catch {
    return fallback as Exclude<Locale, 'auto'>;
  }
}

export function desc(en: string, zh: string): string {
  // Tool descriptions can include both languages so the LLM can map regardless of conversation language.
  return `English: ${en}\n中文: ${zh}`;
}

// Minimal translation dictionary used for server replies and errors
const dict = {
  setLocale: {
    success: {
      en: (l: string) => `Language set to ${l === 'en' ? 'English' : l === 'zh' ? 'Chinese' : 'Auto (detect)'}.`,
      zh: (l: string) => `语言已设置为${l === 'en' ? '英文' : l === 'zh' ? '中文' : '自动（检测）'}。`,
    },
    invalid: {
      en: 'Invalid locale. Use one of: en, zh, auto.',
      zh: '无效的语言参数。可选值：en、zh、auto。',
    },
  },
  errors: {
    prefix: { en: 'Error', zh: '错误' },
    oauth: {
      en: 'Authentication required. Please authenticate first.',
      zh: '需要认证。请先进行认证。',
    },
    zmemory: {
      en: 'ZMemory error',
      zh: 'ZMemory错误',
    },
    unknown: {
      en: 'Unknown error',
      zh: '未知错误',
    },
  },
  auth: {
    start: {
      en: (url: string) => `Open the following URL to authenticate:\n${url}\n\nAfter completion, call exchange_code_for_token with the returned code.`,
      zh: (url: string) => `请访问以下URL进行认证：\n${url}\n\n完成后，请使用返回的授权码调用 exchange_code_for_token 工具。`,
    },
    exchanged: {
      en: (expiresIn: number, tokenType?: string) => `Authentication successful. Access token saved. Token type: ${tokenType || 'N/A'} Expires in: ${expiresIn}s`,
      zh: (expiresIn: number, tokenType?: string) => `认证成功！访问令牌已保存。令牌类型: ${tokenType || '未知'} 过期时间: ${expiresIn}秒`,
    },
    refreshed: {
      en: (expiresIn: number) => `Token refreshed. Expires in: ${expiresIn}s`,
      zh: (expiresIn: number) => `令牌刷新成功！过期时间: ${expiresIn}秒`,
    },
    setToken: {
      en: 'Access token set. You can now use tools.',
      zh: '访问令牌已设置。现在可以使用工具了。',
    },
    cleared: {
      en: 'Authentication state cleared.',
      zh: '认证状态已清除。',
    },
    status: {
      unauth: {
        en: 'Not authenticated. Please authenticate first.',
        zh: '当前未认证。请先进行OAuth认证。',
      },
      auth: (email?: string, expiresAt?: number) => ({
        en: `Authenticated\nUser: ${email || 'Unknown'}\nToken expires at: ${expiresAt ? new Date(expiresAt).toLocaleString() : 'Unknown'}`,
        zh: `认证状态: 已认证\n用户: ${email || '未知'}\n令牌过期时间: ${expiresAt ? new Date(expiresAt).toLocaleString() : '未知'}`,
      }),
    },
  },
} as const;

export function t(locale: Exclude<Locale, 'auto'>, key: string, ...args: any[]): string {
  // Simple path resolver
  const parts = key.split('.');
  let node: any = dict as any;
  for (const p of parts) {
    node = node?.[p];
  }
  if (!node) return key;
  const entry = typeof node === 'function' ? node : node;
  const val = typeof entry === 'function' ? entry(...args) : entry;
  const leaf = typeof val === 'object' && (val.en || val.zh) ? val : null;
  if (leaf) {
    return (leaf as any)[locale] ?? (leaf as any).en ?? key;
  }
  // If entry is a string map
  if (typeof val === 'object' && typeof val[locale] === 'string') {
    return val[locale];
  }
  return typeof val === 'string' ? val : key;
}