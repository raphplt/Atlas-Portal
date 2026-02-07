import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { TranslationProvider } from '@/components/providers/translation-provider';
import { getMessages } from '@/lib/i18n/messages';
import { isLocale, Locale } from '@/lib/i18n/config';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const messages = await getMessages(typedLocale);

  return (
    <TranslationProvider locale={typedLocale} messages={messages}>
      <AppShell locale={typedLocale}>{children}</AppShell>
    </TranslationProvider>
  );
}
