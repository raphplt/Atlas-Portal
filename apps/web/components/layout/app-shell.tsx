'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/translation-provider';
import { Locale } from '@/lib/i18n/config';
import Image from "next/image";
import {
	LayoutDashboard,
	FolderKanban,
	Users,
	Ticket,
	LogOut,
	LogIn,
	Languages,
} from "lucide-react";

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
						{
							href: `/${locale}/dashboard`,
							label: t("nav.dashboard"),
							icon: LayoutDashboard,
						},
						{
							href: `/${locale}/projects`,
							label: t("nav.projects"),
							icon: FolderKanban,
						},
						{ href: `/${locale}/clients`, label: t("nav.clients"), icon: Users },
					]
				: [
						{
							href: `/${locale}/dashboard`,
							label: t("nav.dashboard"),
							icon: LayoutDashboard,
						},
						{
							href: `/${locale}/projects`,
							label: t("nav.myProjects"),
							icon: FolderKanban,
						},
						{ href: `/${locale}/tickets`, label: t("nav.myTickets"), icon: Ticket },
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
									{navItems.map((item) => {
										const Icon = item.icon;
										return (
											<Link
												key={item.href + item.label}
												href={item.href}
												className={`flex items-center gap-2 rounded-(--radius) px-3 py-2 text-sm transition-colors ${pathname?.startsWith(item.href) ? "bg-background-alt text-(--color-foreground)" : "text-muted hover:text-(--color-foreground)"}`}
											>
												<Icon className="h-4 w-4" />
												{item.label}
											</Link>
										);
									})}
								</nav>
								<div className="flex items-center gap-2">
									<Link
										href={alternatePath}
										className="flex items-center gap-1.5 rounded-(--radius) border border-border px-3 py-2 text-xs text-muted hover:text-(--color-foreground) transition-colors"
									>
										<Languages className="h-3.5 w-3.5" />
										{alternateLocale.toUpperCase()}
									</Link>
									{session ? (
										<Button variant="secondary" onClick={() => void logout()}>
											<LogOut className="h-4 w-4" />
											{t("auth.logout")}
										</Button>
									) : (
										<Link href={`/${locale}/login`} className="btn-primary">
											<LogIn className="h-4 w-4" />
											{t("auth.login")}
										</Link>
									)}
								</div>
							</div>
						</header>
						<main className="container-width p-6">{children}</main>
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
