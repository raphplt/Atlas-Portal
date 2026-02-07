'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
}

export default function DashboardPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
        const data = await request<ProjectSummary[]>('/projects?limit=30');
        setProjects(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [locale, ready, request, router, session]);

  return (
    <section className="space-y-6">
      <div>
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.subtitle')}</p>
      </div>

      {loading ? <p>{t('project.loading')}</p> : null}

      {!loading && projects.length === 0 ? <p>{t('dashboard.empty')}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.nextAction ?? t('project.nextAction')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted)]">{t('project.status')}</span>
                <Badge>{project.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted)]">{t('project.progress')}</span>
                <span className="text-sm font-semibold text-[var(--color-foreground)]">{project.progress}%</span>
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
