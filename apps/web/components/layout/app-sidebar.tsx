'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Locale } from '@/lib/i18n/config';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  ChevronDown,
  LayoutDashboard,
  FolderKanban,
  Users,
  Ticket,
  LogOut,
} from 'lucide-react';

interface AppSidebarProps {
  locale: Locale;
}

interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarNavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SidebarNavItem[];
}

export function AppSidebar({ locale }: AppSidebarProps) {
  const { t } = useTranslations();
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const userRole = session?.user?.role;

  const navSections = useMemo<SidebarNavSection[]>(
    () =>
      userRole
        ? userRole === 'ADMIN'
          ? [
              {
                id: 'workspace',
                label: t('nav.group.workspace'),
                icon: LayoutDashboard,
                items: [
                  { href: `/${locale}/dashboard`, label: t('nav.dashboard'), icon: LayoutDashboard },
                ],
              },
              {
                id: 'delivery',
                label: t('nav.group.delivery'),
                icon: FolderKanban,
                items: [
                  { href: `/${locale}/projects`, label: t('nav.projects'), icon: FolderKanban },
                  { href: `/${locale}/tickets`, label: t('tickets.title'), icon: Ticket },
                ],
              },
              {
                id: 'clients',
                label: t('nav.group.clients'),
                icon: Users,
                items: [
                  { href: `/${locale}/clients`, label: t('nav.clients'), icon: Users },
                ],
              },
            ]
          : [
              {
                id: 'workspace',
                label: t('nav.group.workspace'),
                icon: LayoutDashboard,
                items: [
                  { href: `/${locale}/dashboard`, label: t('nav.dashboard'), icon: LayoutDashboard },
                ],
              },
              {
                id: 'projects',
                label: t('nav.group.projects'),
                icon: FolderKanban,
                items: [
                  { href: `/${locale}/projects`, label: t('nav.myProjects'), icon: FolderKanban },
                  { href: `/${locale}/tickets`, label: t('nav.myTickets'), icon: Ticket },
                ],
              },
            ]
        : [],
    [locale, t, userRole],
  );

  const activeSectionId = useMemo(
    () =>
      navSections.find((section) =>
        section.items.some((item) => pathname?.startsWith(item.href)),
      )?.id,
    [navSections, pathname],
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const section of navSections) {
        next[section.id] = prev[section.id] ?? section.id === activeSectionId;
      }
      return next;
    });
  }, [activeSectionId, navSections]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 px-2 py-1.5">
          <Image src="/Logo.png" alt={t('app.title')} width={24} height={24} className="shrink-0" />
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            {t('app.title')}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.menu')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSections.map((section) => {
                const SectionIcon = section.icon;
                const isSectionActive = section.items.some((item) => pathname?.startsWith(item.href));
                const isOpen = openSections[section.id] ?? isSectionActive;
                const hasSingleItem = section.items.length === 1;
                const singleItem = hasSingleItem ? section.items[0] : null;
                const isSingleItemActive = singleItem ? (pathname?.startsWith(singleItem.href) ?? false) : false;

                return (
                  <SidebarMenuItem key={section.id}>
                    {hasSingleItem && singleItem ? (
                      <SidebarMenuButton asChild isActive={isSingleItemActive} tooltip={section.label}>
                        <Link href={singleItem.href}>
                          <SectionIcon className="h-3.5 w-3.5" />
                          <span>{section.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <>
                        <SidebarMenuButton
                          type="button"
                          isActive={isSectionActive}
                          tooltip={section.label}
                          className="justify-between"
                          onClick={() =>
                            setOpenSections((prev) => ({
                              ...prev,
                              [section.id]: !isOpen,
                            }))
                          }
                        >
                          <span className="flex items-center gap-2">
                            <SectionIcon className="h-3.5 w-3.5" />
                            <span>{section.label}</span>
                          </span>
                          <ChevronDown
                            className={`size-4 transition-transform group-data-[collapsible=icon]:hidden ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </SidebarMenuButton>

                        {isOpen ? (
                          <SidebarMenuSub>
                            {section.items.map((item) => {
                              const ItemIcon = item.icon;
                              const isActive = pathname?.startsWith(item.href) ?? false;

                              return (
                                <SidebarMenuSubItem key={item.href}>
                                  <SidebarMenuSubButton asChild isActive={isActive}>
                                    <Link href={item.href}>
                                      <ItemIcon className="h-3.5 w-3.5" />
                                      <span>{item.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        ) : null}
                      </>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {userRole ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => void logout()} tooltip={t('auth.logout')} className='cursor-pointer'>
                <LogOut className="h-3.5 w-3.5" />
                <span>{t('auth.logout')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
