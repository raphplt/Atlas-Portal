'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProjectOverview } from '@/components/portal/project-overview';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  source: string;
}

interface TicketItem {
  id: string;
  title: string;
  status: string;
  type: string;
}

interface MessageItem {
  id: string;
  body: string;
  createdAt: string;
}

interface FileItem {
  id: string;
  originalName: string;
  category: string;
}

interface PaymentItem {
  id: string;
  title: string;
  amountCents: number;
  status: string;
}

interface DashboardPayload {
  project: {
    id: string;
    name: string;
    status: string;
    progress: number;
    nextAction?: string | null;
  };
  summary: {
    totalTasks: number;
    doneTasks: number;
    blockedTasks: number;
    completionRate: number;
  };
}

export default function ProjectDetailPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const router = useRouter();
  const { t } = useTranslations();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      setError(null);
      const [dashboardData, tasksData, ticketsData, messagesData, filesData, paymentsData] = await Promise.all([
        request<DashboardPayload>(`/projects/${id}/dashboard`),
        request<TaskItem[]>(`/tasks?projectId=${id}&limit=100`),
        request<TicketItem[]>(`/tickets?projectId=${id}&limit=100`),
        request<MessageItem[]>(`/messages?projectId=${id}&limit=100`),
        request<FileItem[]>(`/files?projectId=${id}&limit=100`),
        request<PaymentItem[]>(`/payments?projectId=${id}&limit=100`),
      ]);

      setDashboard(dashboardData);
      setTasks(tasksData);
      setTickets(ticketsData);
      setMessages(messagesData);
      setFiles(filesData);
      setPayments(paymentsData);
    } catch {
      setError(t('project.error'));
    } finally {
      setLoading(false);
    }
  }, [id, request, session, t]);

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

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request('/tasks', {
      method: 'POST',
      body: {
        projectId: id,
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
      },
    });
    event.currentTarget.reset();
    await loadData();
  };

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request('/tickets', {
      method: 'POST',
      body: {
        projectId: id,
        type: String(formData.get('type') ?? 'QUESTION'),
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
      },
    });
    event.currentTarget.reset();
    await loadData();
  };

  const createMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request('/messages', {
      method: 'POST',
      body: {
        projectId: id,
        body: String(formData.get('body') ?? ''),
      },
    });
    event.currentTarget.reset();
    await loadData();
  };

  const requestUploadUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request('/files/upload-url', {
      method: 'POST',
      body: {
        projectId: id,
        originalName: String(formData.get('title') ?? 'file.txt'),
        contentType: 'application/octet-stream',
        sizeBytes: 1024,
      },
    });
    event.currentTarget.reset();
    await loadData();
  };

  const createPaymentRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request('/payments', {
      method: 'POST',
      body: {
        projectId: id,
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        amountCents: Number(formData.get('amountCents') ?? 0),
      },
    });
    event.currentTarget.reset();
    await loadData();
  };

  if (loading) {
    return <p>{t('project.loading')}</p>;
  }

  if (error || !dashboard) {
    return <p>{error ?? t('project.error')}</p>;
  }

  return (
    <section className="space-y-6">
      <ProjectOverview dashboard={dashboard} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.tasks')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <p className="font-medium text-[var(--color-foreground)]">{task.title}</p>
                <p className="text-xs text-[var(--color-muted)]">{task.status}</p>
              </div>
            ))}
            {session?.user.role === 'ADMIN' ? (
              <form className="space-y-2" onSubmit={(event) => void createTask(event)}>
                <Label htmlFor="task-title">{t('project.form.title')}</Label>
                <Input id="task-title" name="title" required />
                <Label htmlFor="task-description">{t('project.form.description')}</Label>
                <Textarea id="task-description" name="description" required />
                <Button type="submit">{t('project.task.create')}</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.tickets')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <p className="font-medium text-[var(--color-foreground)]">{ticket.title}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {ticket.type} · {ticket.status}
                </p>
              </div>
            ))}
            <form className="space-y-2" onSubmit={(event) => void createTicket(event)}>
              <Label htmlFor="ticket-type">{t('project.form.type')}</Label>
              <select id="ticket-type" name="type" className="input-base" defaultValue="QUESTION">
                <option value="QUESTION">{t('ticket.type.question')}</option>
                <option value="BUG">{t('ticket.type.bug')}</option>
                <option value="MODIFICATION">{t('ticket.type.modification')}</option>
                <option value="IMPROVEMENT">{t('ticket.type.improvement')}</option>
              </select>
              <Label htmlFor="ticket-title">{t('project.form.title')}</Label>
              <Input id="ticket-title" name="title" required />
              <Label htmlFor="ticket-description">{t('project.form.description')}</Label>
              <Textarea id="ticket-description" name="description" required />
              <Button type="submit">{t('project.ticket.create')}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('project.section.messages')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <p className="text-sm text-[var(--color-foreground)]">{message.body}</p>
              </div>
            ))}
            <form className="space-y-2" onSubmit={(event) => void createMessage(event)}>
              <Label htmlFor="message-body">{t('project.form.description')}</Label>
              <Textarea id="message-body" name="body" required />
              <Button type="submit">{t('project.message.send')}</Button>
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
                <p className="text-sm text-[var(--color-foreground)]">{file.originalName}</p>
                <p className="text-xs text-[var(--color-muted)]">{file.category}</p>
              </div>
            ))}
            <form className="space-y-2" onSubmit={(event) => void requestUploadUrl(event)}>
              <Label htmlFor="file-title">{t('project.form.title')}</Label>
              <Input id="file-title" name="title" required />
              <Button type="submit">{t('project.file.upload')}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('project.section.payments')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
              <p className="font-medium text-[var(--color-foreground)]">{payment.title}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {payment.status} · {payment.amountCents}
              </p>
            </div>
          ))}
          {session?.user.role === 'ADMIN' ? (
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
                <Textarea id="payment-description" name="description" required />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">{t('project.payment.create')}</Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
