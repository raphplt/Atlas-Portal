import { Locale } from './config';

export type Messages = Record<string, string>;

const messageLoaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import('../../messages/en.json'),
  fr: () => import('../../messages/fr.json'),
};

export async function getMessages(locale: Locale): Promise<Messages> {
  return (await messageLoaders[locale]()).default;
}
