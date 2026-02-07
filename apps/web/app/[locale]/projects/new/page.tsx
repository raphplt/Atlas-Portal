'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClientSummary } from '@/lib/portal/types';

export default function NewProjectPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslations();
  const preselectedClientId = searchParams.get('clientId') ?? '';

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setError(null);
      const data = await request<ClientSummary[]>('/users/clients?limit=100');
      setClients(data);
    } catch {
      setError(t('projects.createError'));
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

    if (session.user.role !== 'ADMIN') {
      router.push(`/${locale}/projects`);
      return;
    }

    void loadClients();
  }, [loadClients, locale, ready, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

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

      router.push(`/${locale}/projects`);
    } catch {
      setError(t('projects.createError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link href={`/${locale}/projects`} className="text-sm text-muted-foreground hover:underline">
          {t('project.backToProjects')}
        </Link>
        <h1>{t('projects.createTitle')}</h1>
        <p>{t('projects.createDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('projects.createTitle')}</CardTitle>
          <CardDescription>{t('projects.createDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          {loading ? <p>{t('project.loading')}</p> : null}

          {!loading ? (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
              <div>
                <Label htmlFor="project-client">{t('projects.form.client')}</Label>
                <select id="project-client" name="clientId" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm" defaultValue={preselectedClientId} required>
                  <option value="">{t('projects.form.clientPlaceholder')}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {[client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.email}
                      {' '}
                      ({client.email})
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
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={submitting || clients.length === 0}>
                  {t('projects.form.submit')}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/${locale}/projects`}>{t('common.cancel')}</Link>
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
