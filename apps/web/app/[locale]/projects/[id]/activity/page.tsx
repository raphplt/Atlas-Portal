'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { AuditItem } from '@/lib/portal/types';

export default function ProjectActivityPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, error, setError, isAdmin, request } = useProjectPageBase(locale, id);
  const [events, setEvents] = useState<AuditItem[]>([]);

  const loadActivity = useCallback(async () => {
    try {
      const data = await request<AuditItem[]>(`/audit/projects/${id}?limit=100`);
      setEvents(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadActivity();
  }, [loadActivity, project]);

  if (loading || !project) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="activity">
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="space-y-2">
        {events.length === 0 ? <p>{t('activity.empty')}</p> : null}
        {events.map((event) => (
          <div key={event.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
            <p className="text-sm font-medium text-[var(--color-foreground)]">{event.action}</p>
            <p className="text-xs text-[var(--color-muted)]">
              {event.resourceType} · {new Date(event.createdAt).toLocaleString(locale)}
            </p>
          </div>
        ))}
      </div>
    </ProjectPageShell>
  );
}
