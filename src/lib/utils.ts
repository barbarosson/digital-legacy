import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number, locale?: string) {
  const raw =
    locale ??
    (typeof document !== "undefined"
      ? document.documentElement.lang || "en"
      : "en");
  const intlLocale = raw === "tr" || raw.startsWith("tr") ? "tr-TR" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
