'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectOverview } from '@/components/portal/project-overview';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPayload } from '@/lib/portal/types';

export default function ProjectOverviewPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const {
    project,
    loading,
    error,
    setError,
    isAdmin,
    request,
  } = useProjectPageBase(locale, id);

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await request<DashboardPayload>(`/projects/${id}/dashboard`);
      setDashboard(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadData();
  }, [loadData, project]);

  if (loading || !project || !dashboard) {
    return <p>{t('project.loading')}</p>;
  }

  if (error) {
    return <p>{t('project.error')}</p>;
  }

  return (
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="overview">
      <div className="space-y-6">
        <ProjectOverview dashboard={dashboard} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>{t('project.section.tasks')}</CardDescription>
              <CardTitle>{dashboard.summary.totalTasks}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link className="text-sm text-[var(--color-primary)] hover:underline" href={`/${locale}/projects/${id}/tasks`}>
                {t('project.goToModule')}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>{t('project.tasks.done')}</CardDescription>
              <CardTitle>{dashboard.summary.doneTasks}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link className="text-sm text-[var(--color-primary)] hover:underline" href={`/${locale}/projects/${id}/tasks`}>
                {t('project.goToModule')}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>{t('project.tasks.blocked')}</CardDescription>
              <CardTitle>{dashboard.summary.blockedTasks}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link className="text-sm text-[var(--color-primary)] hover:underline" href={`/${locale}/projects/${id}/tasks`}>
                {t('project.goToModule')}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>{t('project.tasks.completionRate')}</CardDescription>
              <CardTitle>{dashboard.summary.completionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Link className="text-sm text-[var(--color-primary)] hover:underline" href={`/${locale}/projects/${id}/overview`}>
                {t('project.goToModule')}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectPageShell>
  );
}
