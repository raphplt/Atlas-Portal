'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { ProjectPayload } from '@/lib/portal/types';
import { ProjectNavigation } from './project-navigation';

interface ProjectPageShellProps {
  locale: string;
  project: ProjectPayload;
  isAdmin: boolean;
  activeTab: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

export function ProjectPageShell({
  locale,
  project,
  isAdmin,
  activeTab,
  children,
  headerAction,
}: ProjectPageShellProps) {
  const { t } = useTranslations();

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Link href={`/${locale}/projects`} className="text-sm text-[var(--color-muted)] hover:underline">
          {t('project.backToProjects')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1>{project.name}</h1>
            <p>{project.description ?? t('projects.noDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{t(`status.project.${project.status}`)}</Badge>
            {headerAction}
          </div>
        </div>
      </div>

      <ProjectNavigation
        locale={locale}
        projectId={project.id}
        active={activeTab}
        isAdmin={isAdmin}
      />

      {children}
    </section>
  );
}
