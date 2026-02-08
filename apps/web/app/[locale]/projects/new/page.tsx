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
import {
  DEFAULT_PROJECT_MILESTONE_TEMPLATE,
  MILESTONE_TEMPLATE_PRESETS,
  MILESTONE_TYPE_ORDER,
  normalizeMilestones,
} from '@/lib/portal/project-milestones';
import {
  ClientSummary,
  MilestoneTypeKey,
  ProjectMilestoneTemplate,
} from '@/lib/portal/types';

export default function NewProjectPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslations();
  const preselectedClientId = searchParams.get('clientId') ?? '';

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId);
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientWebsite, setClientWebsite] = useState('');
  const [milestoneTemplate, setMilestoneTemplate] = useState<ProjectMilestoneTemplate>(
    DEFAULT_PROJECT_MILESTONE_TEMPLATE,
  );
  const [selectedMilestones, setSelectedMilestones] = useState<MilestoneTypeKey[]>(
    [...MILESTONE_TEMPLATE_PRESETS[DEFAULT_PROJECT_MILESTONE_TEMPLATE]],
  );
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

  useEffect(() => {
    if (!clients.length || !selectedClientId) return;
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    if (!selectedClient) return;
    if (!clientEmail) {
      setClientEmail(selectedClient.email);
    }
  }, [clientEmail, clients, selectedClientId]);

  function applyTemplate(template: ProjectMilestoneTemplate) {
    setMilestoneTemplate(template);
    setSelectedMilestones([...MILESTONE_TEMPLATE_PRESETS[template]]);
  }

  function toggleMilestone(type: MilestoneTypeKey) {
    setSelectedMilestones((previous) => {
      if (previous.includes(type)) {
        return previous.filter((item) => item !== type);
      }
      return normalizeMilestones([...previous, type]);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedClientId) {
      setError(t('projects.createError'));
      return;
    }

    const normalizedMilestones = normalizeMilestones(selectedMilestones);
    if (normalizedMilestones.length === 0) {
      setError(t('projects.form.milestonesRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await request('/projects', {
        method: 'POST',
        body: {
          clientId: selectedClientId,
          name: String(formData.get('name') ?? ''),
          clientCompany: clientCompany.trim() || undefined,
          clientEmail: clientEmail.trim().toLowerCase() || undefined,
          clientWebsite: clientWebsite.trim() || undefined,
          description: String(formData.get('description') ?? '').trim() || undefined,
          nextAction: String(formData.get('nextAction') ?? '').trim() || undefined,
          progress: Number(formData.get('progress') ?? 0),
          estimatedDeliveryAt: formData.get('estimatedDeliveryAt')
            ? new Date(String(formData.get('estimatedDeliveryAt'))).toISOString()
            : undefined,
          milestoneTemplate,
          milestoneTypes: normalizedMilestones,
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
                <select
                  id="project-client"
                  name="clientId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                  value={selectedClientId}
                  onChange={(event) => {
                    const nextClientId = event.target.value;
                    setSelectedClientId(nextClientId);
                    const selectedClient = clients.find((client) => client.id === nextClientId);
                    if (selectedClient) {
                      setClientEmail(selectedClient.email);
                    }
                  }}
                  required
                >
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
              <div>
                <Label htmlFor="project-client-company">{t('projects.form.clientCompany')}</Label>
                <Input
                  id="project-client-company"
                  value={clientCompany}
                  onChange={(event) => setClientCompany(event.target.value)}
                  placeholder={t('projects.form.clientCompanyPlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="project-client-email">{t('projects.form.clientEmail')}</Label>
                <Input
                  id="project-client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  placeholder={t('projects.form.clientEmailPlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="project-client-website">{t('projects.form.clientWebsite')}</Label>
                <Input
                  id="project-client-website"
                  value={clientWebsite}
                  onChange={(event) => setClientWebsite(event.target.value)}
                  placeholder={t('projects.form.clientWebsitePlaceholder')}
                />
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
              <div className="md:col-span-2">
                <Label htmlFor="project-milestone-template">{t('projects.form.milestoneTemplate')}</Label>
                <select
                  id="project-milestone-template"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                  value={milestoneTemplate}
                  onChange={(event) => applyTemplate(event.target.value as ProjectMilestoneTemplate)}
                >
                  {Object.keys(MILESTONE_TEMPLATE_PRESETS).map((templateKey) => (
                    <option key={templateKey} value={templateKey}>
                      {t(`projects.templates.${templateKey}.label`)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`projects.templates.${milestoneTemplate}.description`)}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label>{t('projects.form.milestones')}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MILESTONE_TYPE_ORDER.map((milestoneType) => {
                    const checked = selectedMilestones.includes(milestoneType);
                    return (
                      <label
                        key={milestoneType}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input bg-background text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={() => toggleMilestone(milestoneType)}
                        />
                        <span>{t(`status.milestone.${milestoneType}`)}</span>
                      </label>
                    );
                  })}
                </div>
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
