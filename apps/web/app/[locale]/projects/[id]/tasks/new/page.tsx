'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;

export default function NewTaskPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, isAdmin, request, router } = useProjectPageBase(locale, id, {
    adminOnly: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setSubmitting(true);
    setError(null);

    try {
      await request('/tasks', {
        method: 'POST',
        body: {
          projectId: id,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          status: String(formData.get('status') ?? 'BACKLOG'),
        },
      });

      router.push(`/${locale}/projects/${id}/tasks`);
    } catch {
      setError(t('project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !project || !isAdmin) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="tasks">
      <Card>
        <CardHeader>
          <CardTitle>{t('project.task.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <Label htmlFor="task-title">{t('project.form.title')}</Label>
              <Input id="task-title" name="title" required />
            </div>
            <div>
              <Label htmlFor="task-description">{t('project.form.description')}</Label>
              <Textarea id="task-description" name="description" />
            </div>
            <div>
              <Label htmlFor="task-status">{t('project.form.status')}</Label>
              <select id="task-status" name="status" className="input-base" defaultValue="BACKLOG">
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.task.${status}`)}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{t('project.task.create')}</Button>
              <Link className="btn-secondary" href={`/${locale}/projects/${id}/tasks`}>{t('common.cancel')}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProjectPageShell>
  );
}
