'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MilestoneItem } from '@/lib/portal/types';

const TYPES = ['DESIGN', 'CONTENT', 'DELIVERY'] as const;

export default function ProjectMilestonesPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, error, setError, isAdmin, request } = useProjectPageBase(locale, id);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);

  const loadMilestones = useCallback(async () => {
    try {
      const data = await request<MilestoneItem[]>(`/projects/${id}/milestones`);
      setMilestones(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadMilestones();
  }, [loadMilestones, project]);

  async function toggle(type: string, validated: boolean) {
    try {
      await request(`/projects/${id}/milestones/validate`, {
        method: 'POST',
        body: { type, validated },
      });
      await loadMilestones();
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }

  if (loading || !project) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="milestones">
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {TYPES.map((type) => {
          const milestone = milestones.find((item) => item.type === type);
          const validated = milestone?.validated ?? false;

          return (
            <div key={type} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-[var(--color-foreground)]">{t(`status.milestone.${type}`)}</p>
                <Badge>{validated ? t('common.validated') : t('common.pending')}</Badge>
              </div>
              <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => void toggle(type, !validated)}>
                {validated ? t('project.milestone.unvalidate') : t('project.milestone.validate')}
              </Button>
            </div>
          );
        })}
      </div>
    </ProjectPageShell>
  );
}
