'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  MilestoneItem,
  MilestoneTypeKey,
  ProjectMilestoneTemplate,
} from '@/lib/portal/types';

const PROJECT_STATUSES = ['IN_PROGRESS', 'WAITING_CLIENT', 'COMPLETED'] as const;
const selectClasses =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectFormState {
  clientId: string;
  name: string;
  description: string;
  status: string;
  nextAction: string;
  progress: string;
  estimatedDeliveryAt: string;
  clientCompany: string;
  clientEmail: string;
  clientWebsite: string;
}

const EMPTY_FORM: ProjectFormState = {
  clientId: '',
  name: '',
  description: '',
  status: 'IN_PROGRESS',
  nextAction: '',
  progress: '0',
  estimatedDeliveryAt: '',
  clientCompany: '',
  clientEmail: '',
  clientWebsite: '',
};

export function EditProjectDialog({ open, onOpenChange }: EditProjectDialogProps) {
  const { t } = useTranslations();
  const { project, projectId, request, refreshProject } = useProjectContext();
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedMilestones, setSelectedMilestones] = useState<MilestoneTypeKey[]>(
    [...MILESTONE_TEMPLATE_PRESETS[DEFAULT_PROJECT_MILESTONE_TEMPLATE]],
  );
  const [milestoneTemplate, setMilestoneTemplate] = useState<ProjectMilestoneTemplate>(
    DEFAULT_PROJECT_MILESTONE_TEMPLATE,
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadyToSubmit = useMemo(
    () => form.clientId.trim().length > 0 && form.name.trim().length > 0,
    [form.clientId, form.name],
  );

  useEffect(() => {
    if (!open || !project) return;

    setForm({
      clientId: project.clientId,
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      nextAction: project.nextAction ?? '',
      progress: String(project.progress ?? 0),
      estimatedDeliveryAt: project.estimatedDeliveryAt
        ? project.estimatedDeliveryAt.split('T')[0] ?? ''
        : '',
      clientCompany: project.clientCompany ?? '',
      clientEmail: project.clientEmail ?? '',
      clientWebsite: project.clientWebsite ?? '',
    });

    const initialTemplate =
      project.milestoneTemplate &&
      Object.prototype.hasOwnProperty.call(
        MILESTONE_TEMPLATE_PRESETS,
        project.milestoneTemplate,
      )
        ? project.milestoneTemplate
        : DEFAULT_PROJECT_MILESTONE_TEMPLATE;
    setMilestoneTemplate(initialTemplate);
    setSelectedMilestones([...MILESTONE_TEMPLATE_PRESETS[initialTemplate]]);

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientsData, milestonesData] = await Promise.all([
          request<ClientSummary[]>('/users/clients?limit=100'),
          request<MilestoneItem[]>(`/projects/${projectId}/milestones`),
        ]);
        setClients(clientsData);
        const milestoneTypes = normalizeMilestones(
          milestonesData.map((item) => item.type as MilestoneTypeKey),
        );
        if (milestoneTypes.length > 0) {
          setSelectedMilestones(milestoneTypes);
        }
      } catch {
        setError(t('project.actionError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, project, projectId, request, t]);

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

    const normalizedMilestones = normalizeMilestones(selectedMilestones);
    if (normalizedMilestones.length === 0) {
      setError(t('projects.form.milestonesRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await request(`/projects/${projectId}`, {
        method: 'PATCH',
        body: {
          clientId: form.clientId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          status: form.status,
          nextAction: form.nextAction.trim() || null,
          progress: Number(form.progress || 0),
          estimatedDeliveryAt: form.estimatedDeliveryAt
            ? new Date(form.estimatedDeliveryAt).toISOString()
            : null,
          clientCompany: form.clientCompany.trim() || null,
          clientEmail: form.clientEmail.trim().toLowerCase() || null,
          clientWebsite: form.clientWebsite.trim() || null,
          milestoneTemplate,
          milestoneTypes: normalizedMilestones,
        },
      });
      await refreshProject();
      onOpenChange(false);
    } catch {
      setError(t('project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('project.edit.title')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('project.loading')}</p>
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <Label htmlFor="edit-project-client">{t('projects.form.client')}</Label>
              <select
                id="edit-project-client"
                className={selectClasses}
                value={form.clientId}
                onChange={(event) => {
                  const clientId = event.target.value;
                  const selectedClient = clients.find((item) => item.id === clientId);
                  setForm((previous) => ({
                    ...previous,
                    clientId,
                    clientEmail: selectedClient
                      ? selectedClient.email
                      : previous.clientEmail,
                  }));
                }}
                required
              >
                <option value="">{t('projects.form.clientPlaceholder')}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {[client.firstName, client.lastName].filter(Boolean).join(' ').trim() ||
                      client.email}
                    {' '}
                    ({client.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-project-name">{t('projects.form.name')}</Label>
              <Input
                id="edit-project-name"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, name: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-project-status">{t('project.status')}</Label>
              <select
                id="edit-project-status"
                className={selectClasses}
                value={form.status}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, status: event.target.value }))}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.project.${status}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-project-progress">{t('projects.form.progress')}</Label>
              <Input
                id="edit-project-progress"
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, progress: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="edit-project-description">{t('projects.form.description')}</Label>
              <Textarea
                id="edit-project-description"
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, description: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-project-next-action">{t('projects.form.nextAction')}</Label>
              <Input
                id="edit-project-next-action"
                value={form.nextAction}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, nextAction: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-project-estimated-delivery">{t('projects.form.estimatedDelivery')}</Label>
              <Input
                id="edit-project-estimated-delivery"
                type="date"
                value={form.estimatedDeliveryAt}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, estimatedDeliveryAt: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-project-client-company">{t('projects.form.clientCompany')}</Label>
              <Input
                id="edit-project-client-company"
                value={form.clientCompany}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, clientCompany: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-project-client-email">{t('projects.form.clientEmail')}</Label>
              <Input
                id="edit-project-client-email"
                type="email"
                value={form.clientEmail}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, clientEmail: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="edit-project-client-website">{t('projects.form.clientWebsite')}</Label>
              <Input
                id="edit-project-client-website"
                value={form.clientWebsite}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, clientWebsite: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="edit-project-template">{t('projects.form.milestoneTemplate')}</Label>
              <select
                id="edit-project-template"
                className={selectClasses}
                value={milestoneTemplate}
                onChange={(event) => applyTemplate(event.target.value as ProjectMilestoneTemplate)}
              >
                {Object.keys(MILESTONE_TEMPLATE_PRESETS).map((template) => (
                  <option key={template} value={template}>
                    {t(`projects.templates.${template}.label`)}
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

            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!isReadyToSubmit || submitting}>
                {submitting ? t('project.loading') : t('project.edit.submit')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
