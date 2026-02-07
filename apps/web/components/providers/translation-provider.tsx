'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';
import { Locale } from '@/lib/i18n/config';
import { Messages } from '@/lib/i18n/messages';

interface TranslationContextValue {
  locale: Locale;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}

export function TranslationProvider({ locale, messages, children }: TranslationProviderProps) {
  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      t: (key, variables) => {
        const template = messages[key] ?? key;
        if (!variables) {
          return template;
        }

        return Object.entries(variables).reduce((accumulator, [name, value]) => {
          return accumulator.replaceAll(`{${name}}`, String(value));
        }, template);
      },
    }),
    [locale, messages],
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslations() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslations must be used within TranslationProvider');
  }

  return context;
}
