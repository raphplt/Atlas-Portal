'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { ProjectOverview } from '@/components/portal/project-overview';
import { useTranslations } from '@/components/providers/translation-provider';
import { DashboardPayload } from '@/lib/portal/types';

export default function ProjectOverviewPage() {
  const { locale, projectId, project, error, setError, request } = useProjectContext();
  const { t } = useTranslations();

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await request<DashboardPayload>(`/projects/${projectId}/dashboard`);
      setDashboard(data);
      setError(null);
    } catch {
      setError(t('project.overview.loadError'));
    }
  }, [projectId, request, setError, t]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadData();
  }, [loadData, project]);

  if (!project) return null;

  if (!dashboard) {
    return <p>{t('project.loading')}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return <ProjectOverview locale={locale} projectId={projectId} dashboard={dashboard} />;
}
