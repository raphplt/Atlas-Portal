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

const TYPES = ['QUESTION', 'BUG', 'MODIFICATION', 'IMPROVEMENT'] as const;

export default function NewTicketPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, isAdmin, request, router } = useProjectPageBase(locale, id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setSubmitting(true);
    setError(null);

    try {
      await request('/tickets', {
        method: 'POST',
        body: {
          projectId: id,
          type: String(formData.get('type') ?? 'QUESTION'),
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
        },
      });

      router.push(`/${locale}/projects/${id}/tickets`);
    } catch {
      setError(t('project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !project) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="tickets">
      <Card>
        <CardHeader>
          <CardTitle>{t('project.ticket.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <Label htmlFor="ticket-type">{t('project.form.type')}</Label>
              <select id="ticket-type" name="type" className="input-base" defaultValue="QUESTION">
                {TYPES.map((type) => (
                  <option key={type} value={type}>{t(`status.ticketType.${type}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ticket-title">{t('project.form.title')}</Label>
              <Input id="ticket-title" name="title" required />
            </div>
            <div>
              <Label htmlFor="ticket-description">{t('project.form.description')}</Label>
              <Textarea id="ticket-description" name="description" required />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{t('project.ticket.create')}</Button>
              <Link className="btn-secondary" href={`/${locale}/projects/${id}/tickets`}>{t('common.cancel')}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProjectPageShell>
  );
}
