import { ui, defaultLocale, type Locale } from "./ui";

export function useTranslations(locale: Locale) {
  return function t(key: keyof (typeof ui)[typeof defaultLocale]): string {
    return ui[locale][key] ?? ui[defaultLocale][key];
  };
}

export function localizedPath(locale: Locale, path: string): string {
  const clean = path.replace(/^\/+/, "");
  if (locale === defaultLocale) return `/${clean}`;
  return `/${locale}/${clean}`;
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
