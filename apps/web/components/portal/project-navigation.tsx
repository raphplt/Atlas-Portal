'use client';

import Link from 'next/link';
import { useTranslations } from '@/components/providers/translation-provider';
import {
  LayoutDashboard,
  ListTodo,
  Ticket,
  MessageSquare,
  FolderOpen,
  CreditCard,
  Flag,
  Activity,
  Lock
} from 'lucide-react';

interface ProjectNavigationProps {
  locale: string;
  projectId: string;
  active: string;
  isAdmin: boolean;
}

interface Item {
  key: string;
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ProjectNavigation({
  locale,
  projectId,
  active,
  isAdmin,
}: ProjectNavigationProps) {
  const { t } = useTranslations();

  const base = `/${locale}/projects/${projectId}`;
  const items: Item[] = [
    { key: 'overview', href: `${base}/overview`, labelKey: 'project.nav.overview', icon: LayoutDashboard },
    { key: 'tasks', href: `${base}/tasks`, labelKey: 'project.nav.tasks', icon: ListTodo },
    { key: 'tickets', href: `${base}/tickets`, labelKey: 'project.nav.tickets', icon: Ticket },
    { key: 'messages', href: `${base}/messages`, labelKey: 'project.nav.messages', icon: MessageSquare },
    { key: 'files', href: `${base}/files`, labelKey: 'project.nav.files', icon: FolderOpen },
    { key: 'payments', href: `${base}/payments`, labelKey: 'project.nav.payments', icon: CreditCard },
    { key: 'milestones', href: `${base}/milestones`, labelKey: 'project.nav.milestones', icon: Flag },
    { key: 'activity', href: `${base}/activity`, labelKey: 'project.nav.activity', icon: Activity },
  ];

  if (isAdmin) {
    items.push({
      key: 'admin-notes',
      href: `${base}/admin-notes`,
      labelKey: 'project.nav.adminNotes',
      icon: Lock,
    });
  }

  return (
    <nav className="rounded-(--radius) border border-border bg-(--color-card) p-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-2 rounded-(--radius) px-3 py-2 text-sm transition-colors ${
                active === item.key
                  ? 'bg-primary text-(--color-primary-foreground)'
                  : 'text-muted hover:bg-background-alt'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
