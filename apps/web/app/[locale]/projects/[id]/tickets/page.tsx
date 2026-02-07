'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreateTicketDialog } from '@/components/portal/dialogs/create-ticket-dialog';
import { TicketActionDialog } from '@/components/portal/dialogs/ticket-action-dialog';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api-error';
import { PaymentItem, TicketItem } from '@/lib/portal/types';

const STATUS_BADGE_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  NEEDS_INFO: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  PAYMENT_REQUIRED: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
};

/** Returns the valid admin actions for a given ticket status. */
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

/** Returns whether the admin can request payment for this ticket. */
function canRequestPayment(ticket: TicketItem) {
  return ['OPEN', 'NEEDS_INFO', 'ACCEPTED'].includes(ticket.status);
}

export default function ProjectTicketsPage() {
  const { locale, projectId, project, error, setError, isAdmin, request } = useProjectContext();
  const { t } = useTranslations();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Dialog state for reject / needs-info
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'reject' | 'needs-info';
    ticketId: string;
    ticketTitle: string;
  }>({ open: false, action: 'reject', ticketId: '', ticketTitle: '' });

  const loadTickets = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ projectId: projectId, limit: '100' });
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      if (typeFilter !== 'ALL') qs.set('type', typeFilter);
      const data = await request<TicketItem[]>(`/tickets?${qs.toString()}`);
      setTickets(data);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.loadError'));
    }
  }, [projectId, request, setError, statusFilter, typeFilter, t]);

  useEffect(() => {
    if (!project) return;
    void loadTickets();
  }, [loadTickets, project]);

  async function ticketAction(ticketId: string, action: string, body?: { reason?: string }) {
    try {
      await request(`/tickets/${ticketId}/${action}`, { method: 'POST', body });
      await loadTickets();
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.actionError'));
    }
  }

  function openActionDialog(ticket: TicketItem, action: 'reject' | 'needs-info') {
    setActionDialog({ open: true, action, ticketId: ticket.id, ticketTitle: ticket.title });
  }

  async function handleActionConfirm(reason: string) {
    await ticketAction(actionDialog.ticketId, actionDialog.action, reason ? { reason } : undefined);
  }

  async function requestPayment(ticketId: string) {
    const amount = Number(paymentAmounts[ticketId] ?? '0');
    if (!Number.isFinite(amount) || amount < 1) {
      setError(t('project.ticket.invalidPaymentAmount'));
      return;
    }

    try {
      await request(`/tickets/${ticketId}/request-payment`, {
        method: 'POST',
        body: { priceCents: amount },
      });
      setPaymentAmounts((prev) => ({ ...prev, [ticketId]: '' }));
      await loadTickets();
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.actionError'));
    }
  }

  async function payTicket(ticketId: string) {
    try {
      const payments = await request<PaymentItem[]>(
        `/payments?projectId=${projectId}&ticketId=${ticketId}&status=PENDING&limit=1`,
      );
      const linked = payments[0];
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

  if (!project) return null;

  const STATUSES = ['OPEN', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'PAYMENT_REQUIRED', 'PAID', 'CONVERTED'];
  const TYPES = ['QUESTION', 'BUG', 'MODIFICATION', 'IMPROVEMENT'];

  return (
    <>
      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => void loadTickets()} />

      <TicketActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
        action={actionDialog.action}
        ticketTitle={actionDialog.ticketTitle}
        onConfirm={handleActionConfirm}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-2 sm:grid-cols-2 lg:max-w-2xl lg:flex-1">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('tickets.filterAllStatuses')}</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.ticket.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('tickets.filterAllTypes')}</SelectItem>
              {TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`status.ticketType.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto lg:shrink-0">
          {t('project.ticket.create')}
        </Button>
      </div>

      <div className="space-y-3">
        {tickets.length === 0 ? <p>{t('tickets.empty')}</p> : null}
        {tickets.map((ticket) => {
          const badgeColor = STATUS_BADGE_COLORS[ticket.status] ?? '';
          const adminActions = isAdmin ? getAdminActions(ticket) : [];
          const showPaymentRequest = isAdmin && canRequestPayment(ticket);
          const showClientPay = !isAdmin && ticket.status === 'PAYMENT_REQUIRED';

          return (
            <div key={ticket.id} className="rounded-md border border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">{t(`status.ticketType.${ticket.type}`)}</p>
                </div>
                <Badge className={badgeColor}>{t(`status.ticket.${ticket.status}`)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{ticket.description}</p>

              {/* Status reason (rejection / needs-info reason) */}
              {ticket.statusReason ? (
                <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground italic">
                  {ticket.statusReason}
                </p>
              ) : null}

              {/* Price info for paid tickets */}
              {ticket.requiresPayment && ticket.priceCents ? (
                <p className="mt-2 text-sm font-medium text-foreground">
                  {(ticket.priceCents / 100).toLocaleString(locale, { style: 'currency', currency: 'EUR' })}
                </p>
              ) : null}

              {/* Client: Pay button */}
              {showClientPay ? (
                <Button type="button" size="sm" className="mt-3" onClick={() => void payTicket(ticket.id)}>
                  {t('project.payment.payNow')}
                </Button>
              ) : null}

              {/* Admin: contextual actions */}
              {isAdmin && adminActions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {adminActions.map(({ action, labelKey, variant, needsDialog }) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant={variant}
                      onClick={() => {
                        if (needsDialog) {
                          openActionDialog(ticket, action as 'reject' | 'needs-info');
                        } else {
                          void ticketAction(ticket.id, action);
                        }
                      }}
                    >
                      {t(labelKey)}
                    </Button>
                  ))}
                </div>
              ) : null}

              {/* Admin: request payment */}
              {showPaymentRequest ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder={t('project.ticket.paymentAmountPlaceholder')}
                    value={paymentAmounts[ticket.id] ?? ''}
                    onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                    className="max-w-48"
                  />
                  <Button type="button" size="sm" onClick={() => void requestPayment(ticket.id)}>
                    {t('project.ticket.requestPayment')}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
