'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { AuditItem } from '@/lib/portal/types';

export default function ProjectActivityPage() {
  const { locale, projectId, project, error, setError, request } = useProjectContext();
  const { t } = useTranslations();

  const [events, setEvents] = useState<AuditItem[]>([]);

  const loadActivity = useCallback(async () => {
    try {
      const data = await request<AuditItem[]>(`/audit/projects/${projectId}?limit=100`);
      setEvents(data);
      setError(null);
    } catch {
      setError(t('project.activity.loadError'));
    }
  }, [projectId, request, setError, t]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadActivity();
  }, [loadActivity, project]);

  if (!project) return null;

  return (
    <>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-2">
        {events.length === 0 ? <p>{t('activity.empty')}</p> : null}
        {events.map((event) => (
          <div key={event.id} className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">{event.action}</p>
            <p className="text-xs text-muted-foreground">
              {event.resourceType} · {new Date(event.createdAt).toLocaleString(locale)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
