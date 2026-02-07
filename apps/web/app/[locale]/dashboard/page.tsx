'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  progress: number;
  nextAction?: string | null;
  updatedAt: string;
}

export default function DashboardPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }

    void (async () => {
      try {
        setError(null);
        const data = await request<ProjectSummary[]>('/projects?limit=50');
        setProjects(data);
      } catch {
        setError(t('dashboard.error'));
      } finally {
        setLoading(false);
      }
    })();
  }, [locale, ready, request, router, session, t]);

  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((project) => project.status === 'COMPLETED').length;
    const waiting = projects.filter((project) => project.status === 'WAITING_CLIENT').length;
    const avgProgress =
      total === 0 ? 0 : Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / total);

    return { total, completed, waiting, avgProgress };
  }, [projects]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>

        {session?.user.role === 'ADMIN' ? (
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary" href={`/${locale}/projects`}>
              {t('dashboard.cta.newProject')}
            </Link>
            <Link className="btn-secondary" href={`/${locale}/clients`}>
              {t('dashboard.cta.inviteClient')}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>{t('dashboard.metric.projects')}</CardDescription>
            <CardTitle>{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t('dashboard.metric.completed')}</CardDescription>
            <CardTitle>{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t('dashboard.metric.waiting')}</CardDescription>
            <CardTitle>{stats.waiting}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t('dashboard.metric.progress')}</CardDescription>
            <CardTitle>{stats.avgProgress}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {loading ? <p>{t('project.loading')}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error && projects.length === 0 ? <p>{t('dashboard.empty')}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {projects.slice(0, 8).map((project) => (
          <Card key={project.id} className="transition-all hover:shadow-[var(--shadow)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{project.name}</CardTitle>
                <Badge>{t(`status.project.${project.status}`)}</Badge>
              </div>
              <CardDescription>{project.nextAction ?? t('project.nextActionFallback')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs text-[var(--color-muted)]">
                  <span>{t('project.progress')}</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-background-alt)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
                  />
                </div>
              </div>

              <Link className="btn-secondary w-full" href={`/${locale}/projects/${project.id}`}>
                {t('project.open')}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
