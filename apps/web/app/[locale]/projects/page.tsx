'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSummary } from '@/lib/portal/types';
import { Plus, ExternalLink, Trash2, FolderKanban, CheckCircle2 } from 'lucide-react';

export default function ProjectsPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user.role === 'ADMIN';

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await request<ProjectSummary[]>('/projects?limit=100');
      setProjects(data);
    } catch {
      setError(t('projects.error'));
    } finally {
      setLoading(false);
    }
  }, [request, t]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }

    void loadData();
  }, [loadData, locale, ready, router, session]);

  const grouped = useMemo(() => {
    const active = projects.filter((project) => project.status !== 'COMPLETED');
    const done = projects.filter((project) => project.status === 'COMPLETED');
    return { active, done };
  }, [projects]);

  async function handleDeleteProject(projectId: string) {
    const confirmed = window.confirm(t('projects.deleteConfirm'));
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await request(`/projects/${projectId}`, { method: 'DELETE' });
      await loadData();
    } catch {
      setError(t('projects.deleteError'));
    } finally {
      setSubmitting(false);
    }
  }

  function renderProjectCard(project: ProjectSummary) {
    return (
      <Card key={project.id} className="transition-all hover:shadow-(--shadow) hover:border-primary/20 hover:-translate-y-0.5">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="icon-wrapper">
                <FolderKanban className="h-5 w-5" />
              </div>
              <CardTitle>{project.name}</CardTitle>
            </div>
            <Badge>{t(`status.project.${project.status}`)}</Badge>
          </div>
          <CardDescription>{project.description ?? t('projects.noDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>{t('project.progress')}</span>
              <span className="font-semibold">{project.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-background-alt overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-muted">
            {t('project.nextAction')}: {project.nextAction ?? t('project.nextActionFallback')}
          </p>

          <div className="flex gap-2">
            <Link className="btn-secondary w-full flex items-center justify-center gap-2" href={`/${locale}/projects/${project.id}/overview`}>
              <ExternalLink className="h-4 w-4" />
              {t('project.open')}
            </Link>
            {isAdmin ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteProject(project.id)}
                disabled={submitting}
              >
                <Trash2 className="h-4 w-4" />
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-primary" />
            {t('projects.title')}
          </h1>
          <p>{t('projects.subtitle')}</p>
        </div>
        {isAdmin ? (
          <Link className="btn-primary" href={`/${locale}/projects/new`}>
            <Plus className="h-5 w-5" />
            {t('projects.cta.new')}
          </Link>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('project.loading')}</p> : null}

      {!loading && projects.length === 0 ? <p>{t('projects.empty')}</p> : null}

      {grouped.active.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xl flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse"></div>
            {t('projects.section.active')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">{grouped.active.map(renderProjectCard)}</div>
        </div>
      ) : null}

      {grouped.done.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xl flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t('projects.section.done')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">{grouped.done.map(renderProjectCard)}</div>
        </div>
      ) : null}
    </section>
  );
}
