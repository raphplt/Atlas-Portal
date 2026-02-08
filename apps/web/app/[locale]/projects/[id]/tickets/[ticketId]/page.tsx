'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/portal/dialogs/confirm-dialog';
import { TicketActionDialog } from '@/components/portal/dialogs/ticket-action-dialog';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api-error';
import { MessageItem, PaymentItem, TicketItem } from '@/lib/portal/types';
import { ArrowLeft, MessageSquareMore, Ticket, Trash2, Wallet } from 'lucide-react';

const STATUS_BADGE_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  NEEDS_INFO: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  PAYMENT_REQUIRED: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
};

interface PaymentDraft {
  amountEur: string;
  description: string;
}

const EMPTY_PAYMENT_DRAFT: PaymentDraft = {
  amountEur: '',
  description: '',
};

function getAdminActions(ticket: TicketItem) {
  const actions: { action: string; labelKey: string; variant: 'secondary' | 'destructive'; needsDialog: boolean }[] = [];
  const s = ticket.status;

  if (s === 'OPEN' || s === 'NEEDS_INFO') {
    actions.push({ action: 'accept', labelKey: 'project.ticket.accept', variant: 'secondary', needsDialog: false });
  }
  if (s === 'OPEN' || s === 'ACCEPTED') {
    actions.push({ action: 'needs-info', labelKey: 'project.ticket.needsInfo', variant: 'secondary', needsDialog: true });
  }
  if (s === 'OPEN' || s === 'NEEDS_INFO' || s === 'ACCEPTED') {
    actions.push({ action: 'reject', labelKey: 'project.ticket.reject', variant: 'destructive', needsDialog: true });
  }

  return actions;
}

function canRequestPayment(ticket: TicketItem) {
  return ['OPEN', 'NEEDS_INFO', 'ACCEPTED'].includes(ticket.status);
}

export default function TicketDetailPage() {
  const { locale, projectId, project, error, setError, isAdmin, request } = useProjectContext();
  const params = useParams<{ ticketId: string }>();
  const router = useRouter();
  const { t } = useTranslations();

  const ticketId = params.ticketId;
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(EMPTY_PAYMENT_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'reject' | 'needs-info';
  }>({ open: false, action: 'reject' });

  const loadDetail = useCallback(async () => {
    if (!project || !ticketId) return;

    setLoading(true);
    try {
      const [ticketData, ticketMessages, ticketPayments] = await Promise.all([
        request<TicketItem>(`/tickets/${ticketId}`),
        request<MessageItem[]>(`/messages?projectId=${projectId}&ticketId=${ticketId}&limit=20`),
        request<PaymentItem[]>(`/payments?projectId=${projectId}&ticketId=${ticketId}&limit=20`),
      ]);

      if (ticketData.projectId !== projectId) {
        setError(t('project.ticket.notFound'));
        setTicket(null);
      } else {
        setTicket(ticketData);
        setMessages(ticketMessages);
        setPayments(ticketPayments);
        setError(null);
      }
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.loadError'));
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [project, projectId, request, setError, t, ticketId]);

  useEffect(() => {
    if (!project) return;
    void loadDetail();
  }, [loadDetail, project]);

  async function ticketAction(action: string, body?: { reason?: string }) {
    if (!ticket) return;

    try {
      await request(`/tickets/${ticket.id}/${action}`, { method: 'POST', body });
      await loadDetail();
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.actionError'));
    }
  }

  async function handleActionConfirm(reason: string) {
    await ticketAction(actionDialog.action, reason ? { reason } : undefined);
  }

  async function requestPayment() {
    if (!ticket) return;

    const normalizedAmount = paymentDraft.amountEur.replace(',', '.').trim();
    const amount = Number.parseFloat(normalizedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('project.ticket.invalidPaymentAmount'));
      return;
    }

    try {
      await request(`/tickets/${ticket.id}/request-payment`, {
        method: 'POST',
        body: {
          priceCents: Math.round(amount * 100),
          description: paymentDraft.description.trim() || undefined,
          currency: 'EUR',
        },
      });
      setPaymentDraft(EMPTY_PAYMENT_DRAFT);
      await loadDetail();
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.actionError'));
    }
  }

  async function payTicket() {
    if (!ticket) return;

    try {
      const pending = await request<PaymentItem[]>(
        `/payments?projectId=${projectId}&ticketId=${ticket.id}&status=PENDING&limit=1`,
      );
      const linked = pending[0];
      if (!linked) {
        setError(t('project.tickets.noLinkedPayment'));
        return;
      }
      const { url } = await request<{ url: string }>(`/payments/${linked.id}/checkout-session`, { method: 'POST' });
      window.location.href = url;
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.paymentError'));
    }
  }

  async function handleConfirmDelete() {
    if (!ticket) return;
    try {
      await request(`/tickets/${ticket.id}`, { method: 'DELETE' });
      setDeleteTarget(false);
      router.push(`/${locale}/projects/${projectId}/tickets`);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.actionError'));
    }
  }

  function formatDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }

  const latestPayments = useMemo(() => [...payments].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }), [payments]);

  if (!project) return null;

  return (
    <>
      <ConfirmDialog
        open={deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(false); }}
        title={t('project.ticket.deleteTitle')}
        description={t('project.ticket.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onConfirm={() => void handleConfirmDelete()}
      />

      <TicketActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
        action={actionDialog.action}
        ticketTitle={ticket?.title ?? ''}
        onConfirm={handleActionConfirm}
      />

      <section className="space-y-4">
        <Link
          href={`/${locale}/projects/${projectId}/tickets`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('project.ticket.backToTickets')}
        </Link>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
            <div className="h-44 animate-pulse rounded-xl border border-border bg-muted/40" />
          </div>
        ) : null}

        {!loading && !ticket ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{t('project.ticket.notFound')}</p>
            </CardContent>
          </Card>
        ) : null}

        {!loading && ticket ? (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Ticket className="h-3.5 w-3.5" />
                      {t('project.ticket.detailTitle')}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">{ticket.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{ticket.description}</p>
                  </div>
                  <Badge className={STATUS_BADGE_COLORS[ticket.status] ?? ''}>
                    {t(`status.ticket.${ticket.status}`)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>{t('project.ticket.detailSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('project.form.type')}</p>
                      <p className="mt-1 text-sm font-medium">{t(`status.ticketType.${ticket.type}`)}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('project.tickets.createdAt')}</p>
                      <p className="mt-1 text-sm font-medium">{formatDate(ticket.createdAt)}</p>
                    </div>
                  </div>

                  {ticket.statusReason ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
                        {t('project.ticket.statusReasonLabel')}
                      </p>
                      <p>{ticket.statusReason}</p>
                    </div>
                  ) : null}

                  {ticket.requiresPayment && ticket.priceCents ? (
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('project.ticket.paymentDescriptionLabel')}</p>
                      <p className="mt-1 text-sm font-medium">
                        {(ticket.priceCents / 100).toLocaleString(locale, {
                          style: 'currency',
                          currency: ticket.currency ?? 'EUR',
                        })}
                      </p>
                      {ticket.paymentDescription ? (
                        <p className="mt-1 text-sm text-muted-foreground">{ticket.paymentDescription}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {ticket.convertedTaskId ? (
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href={`/${locale}/projects/${projectId}/tasks#task-${ticket.convertedTaskId}`}>
                          {t('project.ticket.openTasks')}
                        </Link>
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href={`/${locale}/projects/${projectId}/messages`}>
                        <MessageSquareMore className="mr-1 h-4 w-4" />
                        {t('project.ticket.openMessages')}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('project.ticket.detailActions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isAdmin ? (
                    <>
                      {getAdminActions(ticket).map(({ action, labelKey, variant, needsDialog }) => (
                        <Button
                          key={action}
                          type="button"
                          size="sm"
                          variant={variant}
                          className="w-full justify-start"
                          onClick={() => {
                            if (needsDialog) {
                              setActionDialog({ open: true, action: action as 'reject' | 'needs-info' });
                            } else {
                              void ticketAction(action);
                            }
                          }}
                        >
                          {t(labelKey)}
                        </Button>
                      ))}

                      {canRequestPayment(ticket) ? (
                        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder={t('project.ticket.requestPaymentAmountEurPlaceholder')}
                            value={paymentDraft.amountEur}
                            onChange={(event) => setPaymentDraft((prev) => ({ ...prev, amountEur: event.target.value }))}
                          />
                          <Input
                            type="text"
                            placeholder={t('project.ticket.requestPaymentDescriptionPlaceholder')}
                            value={paymentDraft.description}
                            onChange={(event) => setPaymentDraft((prev) => ({ ...prev, description: event.target.value }))}
                          />
                          <Button type="button" size="sm" className="w-full" onClick={() => void requestPayment()}>
                            {t('project.ticket.requestPayment')}
                          </Button>
                        </div>
                      ) : null}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(true)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {t('project.ticket.delete')}
                      </Button>
                    </>
                  ) : null}

                  {!isAdmin && ticket.status === 'PAYMENT_REQUIRED' ? (
                    <Button type="button" size="sm" className="w-full justify-start" onClick={() => void payTicket()}>
                      <Wallet className="mr-1 h-4 w-4" />
                      {t('project.payment.payNow')}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('project.ticket.detailMessages')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('project.ticket.noMessages')}</p>
                  ) : (
                    messages.slice(0, 6).map((message) => (
                      <div key={message.id} className="rounded-md border border-border p-3">
                        <p className="text-sm text-foreground">{message.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('project.ticket.detailPayments')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {latestPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('project.ticket.noPayments')}</p>
                  ) : (
                    latestPayments.slice(0, 6).map((payment) => (
                      <div key={payment.id} className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {(payment.amountCents / 100).toLocaleString(locale, {
                              style: 'currency',
                              currency: payment.currency,
                            })}
                          </p>
                          <Badge variant="outline">{t(`status.payment.${payment.status}`)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
