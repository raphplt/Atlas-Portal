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
import { Plus, ExternalLink, Trash2, FolderKanban, CheckCircle2, Clock3 } from 'lucide-react';

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
      <Card key={project.id} className="overflow-hidden border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
        <CardHeader className="gap-3 pb-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-secondary p-2 text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
              <CardTitle className="line-clamp-1 text-base">{project.name}</CardTitle>
            </div>
            <Badge>{t(`status.project.${project.status}`)}</Badge>
          </div>
          <CardDescription className="line-clamp-2">{project.description ?? t('projects.noDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>{t('project.progress')}</span>
              <span className="font-semibold">{project.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('project.nextAction')}: {project.nextAction ?? t('project.nextActionFallback')}
          </p>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/${locale}/projects/${project.id}/overview`}>
                <ExternalLink className="h-4 w-4" />
                {t('project.open')}
              </Link>
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
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
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <FolderKanban className="h-6 w-6 text-primary" />
            {t('projects.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('projects.subtitle')}</p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href={`/${locale}/projects/new`}>
              <Plus className="h-5 w-5" />
              {t('projects.cta.new')}
            </Link>
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('project.loading')}</p> : null}

      {!loading && projects.length === 0 ? <p>{t('projects.empty')}</p> : null}

      {grouped.active.length > 0 ? (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Clock3 className="h-5 w-5 text-primary" />
            {t('projects.section.active')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">{grouped.active.map(renderProjectCard)}</div>
        </div>
      ) : null}

      {grouped.done.length > 0 ? (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {t('projects.section.done')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">{grouped.done.map(renderProjectCard)}</div>
        </div>
      ) : null}
    </section>
  );
}
