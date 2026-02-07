'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/api-error';
import { ProjectSummary } from '@/lib/portal/types';

const TYPES = ['QUESTION', 'BUG', 'MODIFICATION', 'IMPROVEMENT'] as const;

export default function NewTicketGlobalPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await request<ProjectSummary[]>('/projects?limit=100');
      setProjects(data);
    } catch (e) {
      setError(getErrorMessage(e, t, 'projects.error'));
    }
  }, [request, t]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }
    void loadProjects();
  }, [loadProjects, locale, ready, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const projectId = String(formData.get('projectId') ?? '');

    if (!projectId) {
      setError(t('tickets.selectProject'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await request('/tickets', {
        method: 'POST',
        body: {
          projectId,
          type: String(formData.get('type') ?? 'QUESTION'),
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
        },
      });
      router.push(`/${locale}/tickets`);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1>{t('tickets.createGlobal')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tickets.createGlobal')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <Label htmlFor="ticket-project">{t('tickets.selectProject')}</Label>
              <select id="ticket-project" name="projectId" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm" required>
                <option value="">{t('tickets.selectProject')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ticket-type">{t('project.form.type')}</Label>
              <select id="ticket-type" name="type" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm" defaultValue="QUESTION">
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
              <Button type="submit" disabled={submitting}>{t('tickets.createGlobal')}</Button>
              <Button variant="outline" asChild><Link href={`/${locale}/tickets`}>{t('common.cancel')}</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
