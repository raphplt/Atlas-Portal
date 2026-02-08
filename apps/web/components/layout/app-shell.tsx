'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { Locale } from '@/lib/i18n/config';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar } from './app-sidebar';
import { Header } from './header';

interface ShellBodyProps {
  children: ReactNode;
  locale: Locale;
}

function ShellBody({ children, locale }: ShellBodyProps) {
  const { session } = useAuth();
  const pathname = usePathname();
  const hasUserSession = !!session?.user?.role;
  const isLoginPage = pathname?.endsWith('/login');

  if (isLoginPage) {
    return <main className="min-h-svh">{children}</main>;
  }

  return (
    <SidebarProvider>
      {hasUserSession ? <AppSidebar locale={locale} /> : null}
      <SidebarInset>
        <Header locale={locale} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  return (
    <AuthProvider>
      <ShellBody locale={locale}>{children}</ShellBody>
      <Toaster />
    </AuthProvider>
  );
}
