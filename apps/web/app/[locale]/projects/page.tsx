'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  progress: number;
  nextAction?: string | null;
  clientId: string;
}

interface ClientSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export default function ProjectsPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const projectsPromise = request<ProjectSummary[]>('/projects?limit=100');
      const clientsPromise =
        session?.user.role === 'ADMIN'
          ? request<ClientSummary[]>('/users/clients?limit=100')
          : Promise.resolve([]);

      const [projectsData, clientsData] = await Promise.all([
        projectsPromise,
        clientsPromise,
      ]);

      setProjects(projectsData);
      setClients(clientsData);
    } catch {
      setError(t('projects.error'));
    } finally {
      setLoading(false);
    }
  }, [request, session?.user.role, t]);

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

  const clientLabelById = useMemo(() => {
    return new Map(
      clients.map((client) => {
        const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
        return [client.id, name.length > 0 ? `${name} (${client.email})` : client.email] as const;
      }),
    );
  }, [clients]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    setError(null);

    try {
      await request('/projects', {
        method: 'POST',
        body: {
          clientId: String(formData.get('clientId') ?? ''),
          name: String(formData.get('name') ?? ''),
          description: String(formData.get('description') ?? ''),
          nextAction: String(formData.get('nextAction') ?? ''),
          progress: Number(formData.get('progress') ?? 0),
          estimatedDeliveryAt: formData.get('estimatedDeliveryAt')
            ? new Date(String(formData.get('estimatedDeliveryAt'))).toISOString()
            : undefined,
        },
      });

      form.reset();
      setError(null);
      await loadData();
    } catch {
      setError(t('projects.createError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    const confirmed = window.confirm(t('projects.deleteConfirm'));
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await request(`/projects/${projectId}`, {
        method: 'DELETE',
      });
      await loadData();
    } catch {
      setError(t('projects.deleteError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1>{t('projects.title')}</h1>
          <p>{t('projects.subtitle')}</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {session?.user.role === 'ADMIN' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('projects.createTitle')}</CardTitle>
            <CardDescription>{t('projects.createDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleCreateProject(event)}>
              <div>
                <Label htmlFor="project-client">{t('projects.form.client')}</Label>
                <select id="project-client" name="clientId" className="input-base" required>
                  <option value="">{t('projects.form.clientPlaceholder')}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {clientLabelById.get(client.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="project-name">{t('projects.form.name')}</Label>
                <Input id="project-name" name="name" required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="project-description">{t('projects.form.description')}</Label>
                <Textarea id="project-description" name="description" />
              </div>
              <div>
                <Label htmlFor="project-next-action">{t('projects.form.nextAction')}</Label>
                <Input id="project-next-action" name="nextAction" />
              </div>
              <div>
                <Label htmlFor="project-progress">{t('projects.form.progress')}</Label>
                <Input id="project-progress" name="progress" type="number" min={0} max={100} defaultValue={0} required />
              </div>
              <div>
                <Label htmlFor="project-estimated-delivery">{t('projects.form.estimatedDelivery')}</Label>
                <Input id="project-estimated-delivery" name="estimatedDeliveryAt" type="date" />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting || clients.length === 0}>
                  {t('projects.form.submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {loading ? <p>{t('project.loading')}</p> : null}

      {!loading && projects.length === 0 ? <p>{t('projects.empty')}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{project.name}</CardTitle>
                <Badge>{t(`status.project.${project.status}`)}</Badge>
              </div>
              <CardDescription>{project.description ?? t('projects.noDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs text-[var(--color-muted)]">
                  <span>{t('project.progress')}</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-background-alt)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-[var(--color-muted)]">
                {t('project.nextAction')}: {project.nextAction ?? t('project.nextActionFallback')}
              </p>

              <div className="flex gap-2">
                <Link className="btn-secondary w-full" href={`/${locale}/projects/${project.id}`}>
                  {t('project.open')}
                </Link>
                {session?.user.role === 'ADMIN' ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleDeleteProject(project.id)}
                    disabled={submitting}
                  >
                    {t('common.delete')}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
