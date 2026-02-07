'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/components/providers/translation-provider';

interface ProjectOverviewProps {
  dashboard: {
    project: {
      id: string;
      name: string;
      status: string;
      progress: number;
      nextAction?: string | null;
    };
    summary: {
      totalTasks: number;
      doneTasks: number;
      blockedTasks: number;
      completionRate: number;
    };
  };
}

export function ProjectOverview({ dashboard }: ProjectOverviewProps) {
  const { t } = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dashboard.project.name}</CardTitle>
        <CardDescription>{t('project.overview.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{t('project.status')}</p>
          <Badge>{t(`status.project.${dashboard.project.status}`)}</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{t('project.progress')}</p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">{dashboard.project.progress}%</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{t('project.tasks.done')}</p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {dashboard.summary.doneTasks}/{dashboard.summary.totalTasks}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{t('project.tasks.blocked')}</p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">{dashboard.summary.blockedTasks}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{t('project.tasks.completionRate')}</p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">{dashboard.summary.completionRate}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
