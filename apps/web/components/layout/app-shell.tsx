'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/translation-provider';
import { Locale } from '@/lib/i18n/config';
import Image from "next/image";

interface ShellBodyProps {
  children: ReactNode;
  locale: Locale;
}

function ShellBody({ children, locale }: ShellBodyProps) {
  const { t } = useTranslations();
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const alternateLocale = locale === 'fr' ? 'en' : 'fr';

  const navItems = session
			? session.user.role === "ADMIN"
				? [
						{ href: `/${locale}/dashboard`, label: t("nav.dashboard") },
						{ href: `/${locale}/projects`, label: t("nav.projects") },
						{ href: `/${locale}/clients`, label: t("nav.clients") },
					]
				: [
						{ href: `/${locale}/dashboard`, label: t("nav.dashboard") },
						{ href: `/${locale}/projects`, label: t("nav.myProjects") },
						{ href: `/${locale}/tickets`, label: t("nav.myTickets") },
					]
			: [];

  const alternatePath = pathname
    ? pathname.replace(`/${locale}`, `/${alternateLocale}`)
    : `/${alternateLocale}/dashboard`;
    
    return (
					<div className="min-h-screen bg-dot-pattern">
						<header className="border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur">
							<div className="container-width flex h-16 items-center justify-between">
								<Link
									href={`/${locale}/dashboard`}
									className="text-base font-semibold text-[var(--color-foreground)] flex items-center gap-2"
								>
									<Image src="/Logo.png" alt={t("app.title")} width={24} height={24} />
									{t("app.title")}
								</Link>
								<nav className="hidden items-center gap-2 md:flex">
									{navItems.map((item) => (
										<Link
											key={item.href + item.label}
											href={item.href}
											className={`rounded-[var(--radius)] px-3 py-2 text-sm ${pathname?.startsWith(item.href) ? "bg-[var(--color-background-alt)] text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}`}
										>
											{item.label}
										</Link>
									))}
								</nav>
								<div className="flex items-center gap-2">
									<Link
										href={alternatePath}
										className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]"
									>
										{alternateLocale.toUpperCase()}
									</Link>
									{session ? (
										<Button variant="secondary" onClick={() => void logout()}>
											{t("auth.logout")}
										</Button>
									) : (
										<Link href={`/${locale}/login`} className="btn-primary">
											{t("auth.login")}
										</Link>
									)}
								</div>
							</div>
						</header>
						<main className="container-width section-padding">{children}</main>
					</div>
				);
}

export function AppShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  return (
    <AuthProvider>
      <ShellBody locale={locale}>{children}</ShellBody>
    </AuthProvider>
  );
}
