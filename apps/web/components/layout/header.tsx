'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Languages, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Locale } from '@/lib/i18n/config';

interface HeaderProps {
  locale: Locale;
}

export function Header({ locale }: HeaderProps) {
  const { t } = useTranslations();
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const user = session?.user;
  const hasUserSession = !!user?.role;

  const alternateLocale = locale === 'fr' ? 'en' : 'fr';
  const alternatePath = pathname?.startsWith(`/${locale}`)
    ? pathname.replace(`/${locale}`, `/${alternateLocale}`)
    : `/${alternateLocale}/dashboard`;
  const preferredLocale = user?.locale?.toLowerCase() === 'en' ? 'en' : 'fr';
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const displayName = fullName || user?.email || t('header.account.fallbackName');
  const initials = displayName
    .replace('@', ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        {hasUserSession ? (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </>
        ) : (
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Image src="/Logo.png" alt={t('app.title')} width={24} height={24} />
            {t('app.title')}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        {hasUserSession ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2 pl-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {initials || 'U'}
                </span>
                <span className="max-w-32 truncate text-left">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="space-y-3 p-4">
                <PopoverHeader className="gap-0.5">
                  <PopoverTitle>{displayName}</PopoverTitle>
                  <PopoverDescription>{user?.email}</PopoverDescription>
                </PopoverHeader>

                <div className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t('header.account.role')}</span>
                    <span className="font-medium text-foreground">{t(`header.role.${user?.role}`)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t('header.account.workspace')}</span>
                    <span className="max-w-40 truncate font-medium text-foreground">
                      {session?.workspace?.name ?? t('common.notAvailable')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t('header.account.preferredLocale')}</span>
                    <span className="font-medium text-foreground">{t(`header.locale.${preferredLocale}`)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t('header.account.interfaceLocale')}</span>
                    <span className="font-medium text-foreground">{t(`header.locale.${locale}`)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={alternatePath}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Languages className="h-3.5 w-3.5" />
                    {t('header.account.switchLocale')}
                  </Link>
                  <Button variant="destructive" size="sm" onClick={() => void logout()}>
                    <LogOut className="h-4 w-4" />
                    {t('auth.logout')}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <Link
              href={alternatePath}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Languages className="h-3.5 w-3.5" />
              {alternateLocale.toUpperCase()}
            </Link>
            <Button size="sm" asChild>
              <Link href={`/${locale}/login`}>
                <LogIn className="h-4 w-4" />
                {t('auth.login')}
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
