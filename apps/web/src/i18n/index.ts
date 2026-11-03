import { ref } from 'vue';
import { en } from './en';
import { id } from './id';

export type Locale = 'en' | 'id';
export const LOCALES: readonly { code: Locale; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'id', label: 'ID', name: 'Bahasa Indonesia' },
];

const dictionaries: Record<Locale, typeof en> = { en, id };
const STORAGE_KEY = 'bunus.locale';

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'id') return saved;
  } catch {
    // Storage blocked: fall through to the browser language.
  }
  return navigator.language?.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export const locale = ref<Locale>(initialLocale());
document.documentElement.lang = locale.value;

export function setLocale(next: Locale): void {
  locale.value = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not saving is fine; the choice lasts for this visit.
  }
}

/**
 * Read `copy.x.y` inside a template or computed and it re-renders when the language changes.
 * Do not destructure it once at module or setup level: that freezes the language.
 */
export const copy: typeof en = new Proxy({} as typeof en, {
  get: (_target, key: string) => dictionaries[locale.value][key as keyof typeof en],
});

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

/** Translate a server error by its code; fall back to the server's own message. */
export function apiMessage(code: string, details: Record<string, unknown> | undefined, fallback: string): string {
  const template = copy.apiErrors[code];
  if (!template) return fallback;
  return fill(template, { s: Number(details?.retryAfterSeconds ?? 0) });
}
