'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProjectOverview } from '@/components/portal/project-overview';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProjectPayload {
  id: string;
  name: string;
  status: string;
  progress: number;
  nextAction?: string | null;
  description?: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  source: string;
  blockedReason?: string | null;
}

interface TicketItem {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  requiresPayment: boolean;
  priceCents?: number | null;
  paymentDescription?: string | null;
  createdAt: string;
}

interface MessageItem {
  id: string;
  body: string;
  ticketId?: string | null;
  createdAt: string;
}

interface FileItem {
  id: string;
  originalName: string;
  category: string;
  isUploaded: boolean;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  title: string;
  description?: string | null;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface AuditItem {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
}

interface MilestoneItem {
  id: string;
  type: string;
  validated: boolean;
  comment?: string | null;
  validatedAt?: string | null;
}

interface AdminNoteItem {
  id: string;
  content: string;
  createdAt: string;
}

interface DashboardPayload {
  project: ProjectPayload;
  summary: {
    totalTasks: number;
    doneTasks: number;
    blockedTasks: number;
    completionRate: number;
  };
}

const TASK_STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;
const TICKET_TYPES = ['QUESTION', 'BUG', 'MODIFICATION', 'IMPROVEMENT'] as const;
const MILESTONES = ['DESIGN', 'CONTENT', 'DELIVERY'] as const;

export default function ProjectDetailPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const router = useRouter();
  const { t } = useTranslations();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [notes, setNotes] = useState<AdminNoteItem[]>([]);
  const [ticketPaymentAmounts, setTicketPaymentAmounts] = useState<Record<string, string>>({});

  const isAdmin = session?.user.role === 'ADMIN';

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      setError(null);
      const [
        projectData,
        dashboardData,
        tasksData,
        ticketsData,
        messagesData,
        filesData,
        paymentsData,
        auditData,
        milestonesData,
        notesData,
      ] = await Promise.all([
        request<ProjectPayload>(`/projects/${id}`),
        request<DashboardPayload>(`/projects/${id}/dashboard`),
        request<TaskItem[]>(`/tasks?projectId=${id}&limit=100`),
        request<TicketItem[]>(`/tickets?projectId=${id}&limit=100`),
        request<MessageItem[]>(`/messages?projectId=${id}&limit=100`),
        request<FileItem[]>(`/files?projectId=${id}&limit=100`),
        request<PaymentItem[]>(`/payments?projectId=${id}&limit=100`),
        request<AuditItem[]>(`/audit/projects/${id}?limit=100`),
        request<MilestoneItem[]>(`/projects/${id}/milestones`),
        isAdmin
          ? request<AdminNoteItem[]>(`/admin-notes?projectId=${id}`)
          : Promise.resolve([]),
      ]);

      setProject(projectData);
      setDashboard(dashboardData);
      setTasks(tasksData);
      setTickets(ticketsData);
      setMessages(messagesData.slice().reverse());
      setFiles(filesData);
      setPayments(paymentsData);
      setAudit(auditData);
      setMilestones(milestonesData);
      setNotes(notesData);
    } catch {
      setError(t('project.error'));
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, request, session, t]);

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

  const tasksByStatus = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    TASK_STATUSES.forEach((status) => map.set(status, []));

    tasks.forEach((task) => {
      const existing = map.get(task.status) ?? [];
      existing.push(task);
      map.set(task.status, existing);
    });

    return map;
  }, [tasks]);

  async function withReload(action: () => Promise<void>) {
    setSubmitting(true);
    try {
      await action();
      await loadData();
    } catch {
      setError(t('project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await withReload(async () => {
      await request('/tasks', {
        method: 'POST',
        body: {
          projectId: id,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          status: String(formData.get('status') ?? 'BACKLOG'),
        },
      });
      form.reset();
    });
  }

  async function updateTaskStatus(taskId: string, status: string) {
    await withReload(async () => {
      await request(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: {
          status,
        },
      });
    });
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await withReload(async () => {
      await request('/tickets', {
        method: 'POST',
        body: {
          projectId: id,
          type: String(formData.get('type') ?? 'QUESTION'),
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
        },
      });
      form.reset();
    });
  }

  async function ticketAction(ticketId: string, action: string) {
    await withReload(async () => {
      await request(`/tickets/${ticketId}/${action}`, {
        method: 'POST',
      });
    });
  }

  async function requestTicketPayment(ticketId: string) {
    const rawAmount = ticketPaymentAmounts[ticketId] ?? '';
    const amount = Number(rawAmount);

    if (!Number.isFinite(amount) || amount < 1) {
      setError(t('project.ticket.invalidPaymentAmount'));
      return;
    }

    await withReload(async () => {
      await request(`/tickets/${ticketId}/request-payment`, {
        method: 'POST',
        body: {
          priceCents: amount,
        },
      });
    });
  }

  async function createMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await withReload(async () => {
      await request('/messages', {
        method: 'POST',
        body: {
          projectId: id,
          body: String(formData.get('body') ?? ''),
        },
      });
      form.reset();
    });
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const uploadedFile = formData.get('file');

    if (!(uploadedFile instanceof File)) {
      setError(t('project.file.invalidFile'));
      return;
    }

    await withReload(async () => {
      const uploadMeta = await request<{ fileId: string; uploadUrl: string }>('/files/upload-url', {
        method: 'POST',
        body: {
          projectId: id,
          originalName: uploadedFile.name,
          contentType: uploadedFile.type || 'application/octet-stream',
          sizeBytes: uploadedFile.size,
          category: String(formData.get('category') ?? 'OTHER'),
        },
      });

      const uploadResponse = await fetch(uploadMeta.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': uploadedFile.type || 'application/octet-stream',
        },
        body: uploadedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      await request(`/files/${uploadMeta.fileId}/complete`, {
        method: 'POST',
        body: {},
      });

      form.reset();
    });
  }

  async function downloadFile(fileId: string) {
    try {
      const payload = await request<{ downloadUrl: string }>(`/files/${fileId}/download-url`);
      window.open(payload.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError(t('project.file.downloadError'));
    }
  }

  async function createPaymentRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await withReload(async () => {
      await request('/payments', {
        method: 'POST',
        body: {
          projectId: id,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          amountCents: Number(formData.get('amountCents') ?? 0),
        },
      });
      form.reset();
    });
  }

  async function payPayment(paymentId: string) {
    try {
      const payload = await request<{ url: string }>(`/payments/${paymentId}/checkout-session`, {
        method: 'POST',
      });
      window.location.href = payload.url;
    } catch {
      setError(t('project.payment.checkoutError'));
    }
  }

  async function toggleMilestone(type: string, validated: boolean) {
    await withReload(async () => {
      await request(`/projects/${id}/milestones/validate`, {
        method: 'POST',
        body: {
          type,
          validated,
        },
      });
    });
  }

  async function createAdminNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    await withReload(async () => {
      await request('/admin-notes', {
        method: 'POST',
        body: {
          projectId: id,
          content: String(formData.get('content') ?? ''),
        },
      });

      form.reset();
    });
  }

  async function deleteAdminNote(noteId: string) {
    await withReload(async () => {
      await request(`/admin-notes/${noteId}`, {
        method: 'DELETE',
      });
    });
  }

  async function deleteProject() {
    if (!isAdmin) {
      return;
    }

    const confirmed = window.confirm(t('projects.deleteConfirm'));
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await request(`/projects/${id}`, {
        method: 'DELETE',
      });
      router.push(`/${locale}/projects`);
    } catch {
      setError(t('projects.deleteError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p>{t('project.loading')}</p>;
  }

  if (error && !project) {
    return <p>{error}</p>;
  }

  if (!project || !dashboard) {
    return <p>{t('project.error')}</p>;
  }

  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1>{project.name}</h1>
          <p>{project.description ?? t('projects.noDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{t(`status.project.${project.status}`)}</Badge>
          {isAdmin ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deleteProject()}
              disabled={submitting}
            >
              {t('common.delete')}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ProjectOverview dashboard={dashboard} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.tasks')}</CardTitle>
            <CardDescription>{t('project.tasks.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {TASK_STATUSES.map((status) => (
                <div key={status} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                  <p className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">{t(`status.task.${status}`)}</p>
                  <div className="space-y-2">
                    {(tasksByStatus.get(status) ?? []).map((task) => (
                      <div key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2">
                        <p className="text-sm font-medium text-[var(--color-foreground)]">{task.title}</p>
                        <p className="text-xs text-[var(--color-muted)]">{t(`status.taskSource.${task.source}`)}</p>
                        {isAdmin ? (
                          <select
                            className="input-base mt-2"
                            value={task.status}
                            onChange={(event) => void updateTaskStatus(task.id, event.target.value)}
                            disabled={submitting}
                          >
                            {TASK_STATUSES.map((nextStatus) => (
                              <option key={nextStatus} value={nextStatus}>
                                {t(`status.task.${nextStatus}`)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isAdmin ? (
              <form className="grid gap-2" onSubmit={(event) => void createTask(event)}>
                <Label htmlFor="task-title">{t('project.form.title')}</Label>
                <Input id="task-title" name="title" required />
                <Label htmlFor="task-description">{t('project.form.description')}</Label>
                <Textarea id="task-description" name="description" />
                <Label htmlFor="task-status">{t('project.form.status')}</Label>
                <select id="task-status" name="status" className="input-base" defaultValue="BACKLOG">
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(`status.task.${status}`)}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={submitting}>
                  {t('project.task.create')}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.tickets')}</CardTitle>
            <CardDescription>{t('project.tickets.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium text-[var(--color-foreground)]">{ticket.title}</p>
                  <Badge>{t(`status.ticket.${ticket.status}`)}</Badge>
                </div>
                <p className="text-sm text-[var(--color-muted)]">{ticket.description}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`status.ticketType.${ticket.type}`)}</p>

                {isAdmin ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => void ticketAction(ticket.id, 'accept')}>
                        {t('project.ticket.accept')}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void ticketAction(ticket.id, 'needs-info')}>
                        {t('project.ticket.needsInfo')}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void ticketAction(ticket.id, 'reject')}>
                        {t('project.ticket.reject')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void ticketAction(ticket.id, 'convert-to-task')}
                      >
                        {t('project.ticket.convert')}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder={t('project.ticket.paymentAmountPlaceholder')}
                        value={ticketPaymentAmounts[ticket.id] ?? ''}
                        onChange={(event) =>
                          setTicketPaymentAmounts((previous) => ({
                            ...previous,
                            [ticket.id]: event.target.value,
                          }))
                        }
                      />
                      <Button type="button" size="sm" onClick={() => void requestTicketPayment(ticket.id)}>
                        {t('project.ticket.requestPayment')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            <form className="space-y-2" onSubmit={(event) => void createTicket(event)}>
              <Label htmlFor="ticket-type">{t('project.form.type')}</Label>
              <select id="ticket-type" name="type" className="input-base" defaultValue="QUESTION">
                {TICKET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`status.ticketType.${type}`)}
                  </option>
                ))}
              </select>
              <Label htmlFor="ticket-title">{t('project.form.title')}</Label>
              <Input id="ticket-title" name="title" required />
              <Label htmlFor="ticket-description">{t('project.form.description')}</Label>
              <Textarea id="ticket-description" name="description" required />
              <Button type="submit" disabled={submitting}>
                {t('project.ticket.create')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.messages')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {messages.map((message) => (
                <div key={message.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                  <p className="text-sm text-[var(--color-foreground)]">{message.body}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {new Date(message.createdAt).toLocaleString(locale)}
                  </p>
                </div>
              ))}
            </div>

            <form className="space-y-2" onSubmit={(event) => void createMessage(event)}>
              <Label htmlFor="message-body">{t('project.form.message')}</Label>
              <Textarea id="message-body" name="body" required />
              <Button type="submit" disabled={submitting}>
                {t('project.message.send')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.files')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">{file.originalName}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {t(`status.file.${file.category}`)} · {new Date(file.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  {file.isUploaded ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => void downloadFile(file.id)}>
                      {t('project.file.download')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}

            <form className="space-y-2" onSubmit={(event) => void uploadFile(event)}>
              <Label htmlFor="file-input">{t('project.file.select')}</Label>
              <Input id="file-input" name="file" type="file" required />
              <Label htmlFor="file-category">{t('project.file.category')}</Label>
              <select id="file-category" name="category" className="input-base" defaultValue="OTHER">
                <option value="BRANDING">{t('status.file.BRANDING')}</option>
                <option value="CONTENT">{t('status.file.CONTENT')}</option>
                <option value="DELIVERABLE">{t('status.file.DELIVERABLE')}</option>
                <option value="OTHER">{t('status.file.OTHER')}</option>
              </select>
              <Button type="submit" disabled={submitting}>
                {t('project.file.upload')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.payments')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium text-[var(--color-foreground)]">{payment.title}</p>
                  <Badge>{t(`status.payment.${payment.status}`)}</Badge>
                </div>
                <p className="text-sm text-[var(--color-muted)]">{payment.description ?? ''}</p>
                <p className="mt-1 text-sm text-[var(--color-foreground)]">
                  {(payment.amountCents / 100).toLocaleString(locale, {
                    style: 'currency',
                    currency: payment.currency,
                  })}
                </p>
                {payment.status === 'PENDING' ? (
                  <Button type="button" className="mt-2" size="sm" onClick={() => void payPayment(payment.id)}>
                    {t('project.payment.payNow')}
                  </Button>
                ) : null}
              </div>
            ))}

            {isAdmin ? (
              <form className="grid gap-2 md:grid-cols-2" onSubmit={(event) => void createPaymentRequest(event)}>
                <div>
                  <Label htmlFor="payment-title">{t('project.form.title')}</Label>
                  <Input id="payment-title" name="title" required />
                </div>
                <div>
                  <Label htmlFor="payment-amount">{t('project.form.amount')}</Label>
                  <Input id="payment-amount" name="amountCents" type="number" min={1} required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="payment-description">{t('project.form.description')}</Label>
                  <Textarea id="payment-description" name="description" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={submitting}>
                    {t('project.payment.create')}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.milestones')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MILESTONES.map((type) => {
              const milestone = milestones.find((item) => item.type === type);

              return (
                <div key={type} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[var(--color-foreground)]">{t(`status.milestone.${type}`)}</p>
                    <Badge>{milestone?.validated ? t('common.validated') : t('common.pending')}</Badge>
                  </div>
                  {isAdmin || !milestone?.validated ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => void toggleMilestone(type, !(milestone?.validated ?? false))}
                    >
                      {milestone?.validated ? t('project.milestone.unvalidate') : t('project.milestone.validate')}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.audit')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {audit.map((event) => (
              <div key={event.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <p className="text-sm font-medium text-[var(--color-foreground)]">{event.action}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {event.resourceType} · {new Date(event.createdAt).toLocaleString(locale)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('project.section.adminNotes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                  <p className="text-sm text-[var(--color-foreground)]">{note.content}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-[var(--color-muted)]">{new Date(note.createdAt).toLocaleString(locale)}</p>
                    <Button type="button" size="sm" variant="secondary" onClick={() => void deleteAdminNote(note.id)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              ))}

              <form className="space-y-2" onSubmit={(event) => void createAdminNote(event)}>
                <Label htmlFor="admin-note-content">{t('project.adminNote.content')}</Label>
                <Textarea id="admin-note-content" name="content" required />
                <Button type="submit" disabled={submitting}>
                  {t('project.adminNote.create')}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
