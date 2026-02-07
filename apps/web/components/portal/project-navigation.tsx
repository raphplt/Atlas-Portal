'use client';

import Link from 'next/link';
import { useTranslations } from '@/components/providers/translation-provider';

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
    { key: 'overview', href: `${base}/overview`, labelKey: 'project.nav.overview' },
    { key: 'tasks', href: `${base}/tasks`, labelKey: 'project.nav.tasks' },
    { key: 'tickets', href: `${base}/tickets`, labelKey: 'project.nav.tickets' },
    { key: 'messages', href: `${base}/messages`, labelKey: 'project.nav.messages' },
    { key: 'files', href: `${base}/files`, labelKey: 'project.nav.files' },
    { key: 'payments', href: `${base}/payments`, labelKey: 'project.nav.payments' },
    { key: 'milestones', href: `${base}/milestones`, labelKey: 'project.nav.milestones' },
    { key: 'activity', href: `${base}/activity`, labelKey: 'project.nav.activity' },
  ];

  if (isAdmin) {
    items.push({
      key: 'admin-notes',
      href: `${base}/admin-notes`,
      labelKey: 'project.nav.adminNotes',
    });
  }

  return (
    <nav className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-[var(--radius)] px-3 py-2 text-sm ${
              active === item.key
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-background-alt)]'
            }`}
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
