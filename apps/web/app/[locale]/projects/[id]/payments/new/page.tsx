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

export default function NewPaymentPage() {
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
      await request('/payments', {
        method: 'POST',
        body: {
          projectId: id,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          amountCents: Number(formData.get('amountCents') ?? 0),
        },
      });

      router.push(`/${locale}/projects/${id}/payments`);
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
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="payments">
      <Card>
        <CardHeader>
          <CardTitle>{t('project.payment.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <Label htmlFor="payment-title">{t('project.form.title')}</Label>
              <Input id="payment-title" name="title" required />
            </div>
            <div>
              <Label htmlFor="payment-description">{t('project.form.description')}</Label>
              <Textarea id="payment-description" name="description" />
            </div>
            <div>
              <Label htmlFor="payment-amount">{t('project.form.amount')}</Label>
              <Input id="payment-amount" name="amountCents" type="number" min={1} required />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{t('project.payment.create')}</Button>
              <Link className="btn-secondary" href={`/${locale}/projects/${id}/payments`}>{t('common.cancel')}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProjectPageShell>
  );
}
