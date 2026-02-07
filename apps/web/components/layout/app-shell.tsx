'use client';

import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { Locale } from '@/lib/i18n/config';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { Header } from './header';

interface ShellBodyProps {
  children: ReactNode;
  locale: Locale;
}

function ShellBody({ children, locale }: ShellBodyProps) {
  const { session } = useAuth();
  const hasUserSession = !!session?.user?.role;

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
    </AuthProvider>
  );
}
