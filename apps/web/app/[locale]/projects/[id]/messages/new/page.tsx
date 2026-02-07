'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewMessagePage() {
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
      await request('/messages', {
        method: 'POST',
        body: {
          projectId: id,
          body: String(formData.get('body') ?? ''),
        },
      });
      router.push(`/${locale}/projects/${id}/messages`);
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
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="messages">
      <Card>
        <CardHeader>
          <CardTitle>{t('project.message.send')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <Label htmlFor="message-body">{t('project.form.message')}</Label>
              <Textarea id="message-body" name="body" required />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{t('project.message.send')}</Button>
              <Link className="btn-secondary" href={`/${locale}/projects/${id}/messages`}>{t('common.cancel')}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProjectPageShell>
  );
}
