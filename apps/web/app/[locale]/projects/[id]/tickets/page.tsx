'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/portal/dialogs/confirm-dialog';
import { CreateTicketDialog } from '@/components/portal/dialogs/create-ticket-dialog';
import { TicketActionDialog } from '@/components/portal/dialogs/ticket-action-dialog';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api-error';
import {
  PaginatedTicketsPayload,
  PaymentItem,
  TicketItem,
  TicketSortBy,
  TicketViewFilter,
} from '@/lib/portal/types';
import {
  ArrowUpDown,
  CircleCheckBig,
  MessageSquareMore,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';

const STATUS_BADGE_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  NEEDS_INFO: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  PAYMENT_REQUIRED: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
};

const STATUS_EDGE_COLORS: Record<string, string> = {
  OPEN: 'border-l-blue-400',
  NEEDS_INFO: 'border-l-yellow-400',
  ACCEPTED: 'border-l-emerald-400',
  REJECTED: 'border-l-red-400',
  PAYMENT_REQUIRED: 'border-l-orange-400',
  PAID: 'border-l-emerald-500',
  CONVERTED: 'border-l-violet-400',
};

const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [8, DEFAULT_PAGE_SIZE, 20];

const EMPTY_TICKET_SUMMARY: PaginatedTicketsPayload['summary'] = {
  total: 0,
  actionRequired: 0,
  paymentRequired: 0,
  closed: 0,
};

const EMPTY_TICKET_PAGINATION: PaginatedTicketsPayload['pagination'] = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
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

export default function ProjectTicketsPage() {
  const { locale, projectId, project, error, setError, isAdmin, request } = useProjectContext();
  const { t } = useTranslations();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [viewFilter, setViewFilter] = useState<TicketViewFilter>('ALL');
  const [sortBy, setSortBy] = useState<TicketSortBy>('PRIORITY');
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState<PaginatedTicketsPayload['summary']>(EMPTY_TICKET_SUMMARY);
  const [pagination, setPagination] = useState<PaginatedTicketsPayload['pagination']>(EMPTY_TICKET_PAGINATION);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'reject' | 'needs-info';
    ticketId: string;
    ticketTitle: string;
  }>({ open: false, action: 'reject', ticketId: '', ticketTitle: '' });

  const loadTickets = useCallback(async () => {
    if (!project) return;

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        projectId,
        page: String(page),
        pageSize: String(pageSize),
        view: viewFilter,
        sortBy,
      });
      if (statusFilter !== 'ALL') {
        qs.set('status', statusFilter);
      }
      if (typeFilter !== 'ALL') {
        qs.set('type', typeFilter);
      }
      const normalizedQuery = query.trim();
      if (normalizedQuery.length > 0) {
        qs.set('search', normalizedQuery);
      }

      const data = await request<PaginatedTicketsPayload>(`/tickets/paginated?${qs.toString()}`);
      setSummary(data.summary);
      setPagination(data.pagination);
      if (page > data.pagination.totalPages) {
        setTickets([]);
        setPage(data.pagination.totalPages);
        return;
      }

      setTickets(data.items);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, project, projectId, query, request, setError, sortBy, statusFilter, t, typeFilter, viewFilter]);

  useEffect(() => {
    if (!project) return;
    void loadTickets();
  }, [loadTickets, project]);

  function toggleViewFilter(nextFilter: Exclude<TicketViewFilter, 'ALL'>) {
    setViewFilter((current) => (current === nextFilter ? 'ALL' : nextFilter));
    setPage(1);
  }

  async function ticketAction(ticketId: string, action: string, body?: { reason?: string }) {
    try {
      await request(`/tickets/${ticketId}/${action}`, { method: 'POST', body });
      await loadTickets();
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tickets.actionError'));
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await request(`/tickets/${deleteTarget}`, { method: 'DELETE' });
      setDeleteTarget(null);
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

  function getPaymentDraft(ticketId: string): PaymentDraft {
    return paymentDrafts[ticketId] ?? EMPTY_PAYMENT_DRAFT;
  }

  function setPaymentDraft(ticketId: string, patch: Partial<PaymentDraft>) {
    setPaymentDrafts((prev) => ({
      ...prev,
      [ticketId]: {
        ...(prev[ticketId] ?? EMPTY_PAYMENT_DRAFT),
        ...patch,
      },
    }));
  }

  async function requestPayment(ticket: TicketItem) {
    const draft = getPaymentDraft(ticket.id);
    const normalizedAmount = draft.amountEur.replace(',', '.').trim();
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
          description: draft.description.trim() || undefined,
          currency: 'EUR',
        },
      });
      setPaymentDrafts((prev) => ({
        ...prev,
        [ticket.id]: EMPTY_PAYMENT_DRAFT,
      }));
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

  function formatDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }

  function formatAmount(amountCents: number, currency = 'EUR') {
    return (amountCents / 100).toLocaleString(locale, {
      style: 'currency',
      currency,
    });
  }

  const STATUSES = ['OPEN', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'PAYMENT_REQUIRED', 'PAID', 'CONVERTED'];
  const TYPES = ['QUESTION', 'BUG', 'MODIFICATION', 'IMPROVEMENT'];
  const totalCount = summary.total;
  const actionRequiredCount = summary.actionRequired;
  const paymentRequiredCount = summary.paymentRequired;
  const closedCount = summary.closed;

  if (!project) return null;

  return (
    <>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t('project.ticket.deleteTitle')}
        description={t('project.ticket.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onConfirm={() => void handleConfirmDelete()}
      />

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => void loadTickets()} />

      <TicketActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
        action={actionDialog.action}
        ticketTitle={actionDialog.ticketTitle}
        onConfirm={handleActionConfirm}
      />

      <section className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                className={`min-h-18.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  viewFilter === 'ALL' ? 'border-primary/40 bg-primary/5' : 'border-border/70 bg-background'
                }`}
                onClick={() => {
                  setViewFilter('ALL');
                  setPage(1);
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('project.tickets.kpi.total')}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{totalCount}</p>
              </button>
              <button
                type="button"
                className={`min-h-18.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  viewFilter === 'ACTION_REQUIRED' ? 'border-primary/40 bg-primary/5' : 'border-border/70 bg-background'
                }`}
                onClick={() => toggleViewFilter('ACTION_REQUIRED')}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('project.tickets.kpi.actionRequired')}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{actionRequiredCount}</p>
              </button>
              <button
                type="button"
                className={`min-h-18.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  viewFilter === 'PAYMENT_REQUIRED'
                    ? 'border-orange-300 bg-orange-50/40'
                    : 'border-border/70 bg-background hover:border-orange-300'
                }`}
                onClick={() => toggleViewFilter('PAYMENT_REQUIRED')}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('project.tickets.kpi.paymentRequired')}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-orange-600">{paymentRequiredCount}</p>
              </button>
              <button
                type="button"
                className={`min-h-18.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  viewFilter === 'CLOSED' ? 'border-emerald-300 bg-emerald-50/40' : 'border-border/70 bg-background'
                }`}
                onClick={() => toggleViewFilter('CLOSED')}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('project.tickets.kpi.closed')}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600">{closedCount}</p>
              </button>
            </div>

            <Button
              onClick={() => setCreateOpen(true)}
              variant="outline"
              className="h-full min-h-18.5 w-full justify-start border-dashed border-primary/35 bg-primary/5 px-4 text-primary shadow-none hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('project.ticket.create')}
            </Button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t('project.tickets.searchPlaceholder')}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
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

            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
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

            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as TicketSortBy);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIORITY">{t('project.tickets.sort.priority')}</SelectItem>
                <SelectItem value="NEWEST">{t('project.tickets.sort.newest')}</SelectItem>
                <SelectItem value="OLDEST">{t('project.tickets.sort.oldest')}</SelectItem>
                <SelectItem value="AMOUNT_DESC">{t('project.tickets.sort.amountDesc')}</SelectItem>
                <SelectItem value="AMOUNT_ASC">{t('project.tickets.sort.amountAsc')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {t('project.tickets.resultsCount', { visible: tickets.length, total: pagination.total })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setViewFilter('ALL');
                setSortBy('PRIORITY');
                setQuery('');
                setPage(1);
              }}
            >
              <ArrowUpDown className="mr-1 h-4 w-4" />
              {t('project.tickets.resetFilters')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : null}

        {!loading && tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-base font-medium text-foreground">{t('project.tickets.noResultsTitle')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('project.tickets.noResultsDescription')}</p>
            <Button onClick={() => setCreateOpen(true)} className="mt-4">
              {t('project.ticket.create')}
            </Button>
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const badgeColor = STATUS_BADGE_COLORS[ticket.status] ?? '';
              const adminActions = isAdmin ? getAdminActions(ticket) : [];
              const showPaymentRequest = isAdmin && canRequestPayment(ticket);
              const showClientPay = !isAdmin && ticket.status === 'PAYMENT_REQUIRED';
              const paymentDraft = getPaymentDraft(ticket.id);

              return (
                <Card
                  key={ticket.id}
                  className={`overflow-hidden border border-border/70 border-l-4 bg-linear-to-b from-background to-muted/10 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    STATUS_EDGE_COLORS[ticket.status] ?? 'border-l-primary/40'
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_230px]">
                      <div className="px-4 py-4 sm:px-5">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="font-medium">
                              {t(`status.ticketType.${ticket.type}`)}
                            </Badge>
                            <span className="text-muted-foreground">
                              {t('project.tickets.createdAt')}: {formatDate(ticket.createdAt)}
                            </span>
                            {ticket.requiresPayment && ticket.priceCents ? (
                              <Badge variant="outline" className="font-medium text-foreground">
                                {formatAmount(ticket.priceCents, ticket.currency ?? 'EUR')}
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground">{ticket.title}</h3>
                          <p className="line-clamp-3 text-sm text-muted-foreground">{ticket.description}</p>
                        </div>

                        {ticket.statusReason ? (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                              {t('project.ticket.statusReasonLabel')}
                            </p>
                            <p>{ticket.statusReason}</p>
                          </div>
                        ) : null}

                        {ticket.paymentDescription ? (
                          <div className="mt-3 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{t('project.ticket.paymentDescriptionLabel')}:</span>{' '}
                            {ticket.paymentDescription}
                          </div>
                        ) : null}
                      </div>

                      <aside className="flex flex-col gap-2 border-t border-border/70 bg-muted/25 px-4 py-4 lg:border-l lg:border-t-0">
                        <div>
                          <Badge className={badgeColor}>{t(`status.ticket.${ticket.status}`)}</Badge>
                        </div>

                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link href={`/${locale}/projects/${projectId}/tickets/${ticket.id}`}>
                            {t('project.ticket.viewDetails')}
                          </Link>
                        </Button>

                        {showClientPay ? (
                          <Button type="button" size="sm" onClick={() => void payTicket(ticket.id)}>
                            <Wallet className="mr-1 h-4 w-4" />
                            {t('project.payment.payNow')}
                          </Button>
                        ) : null}

                        {!isAdmin && ticket.status === 'NEEDS_INFO' ? (
                          <Button type="button" size="sm" variant="outline" asChild>
                            <Link href={`/${locale}/projects/${projectId}/messages`}>
                              <MessageSquareMore className="mr-1 h-4 w-4" />
                              {t('project.ticket.openMessages')}
                            </Link>
                          </Button>
                        ) : null}

                        {ticket.status === 'CONVERTED' ? (
                          <Button type="button" size="sm" variant="outline" asChild>
                            <Link href={`/${locale}/projects/${projectId}/tasks${ticket.convertedTaskId ? `#task-${ticket.convertedTaskId}` : ''}`}>
                              <CircleCheckBig className="mr-1 h-4 w-4" />
                              {t('project.ticket.openTasks')}
                            </Link>
                          </Button>
                        ) : null}
                      </aside>
                    </div>

                    {isAdmin ? (
                      <div className="border-t border-border/70 bg-muted/10 px-4 py-3 sm:px-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {adminActions.length > 0 ? (
                            adminActions.map(({ action, labelKey, variant, needsDialog }) => (
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
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">{t('project.tickets.noActionNeeded')}</span>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-auto text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(ticket.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            {t('project.ticket.delete')}
                          </Button>
                        </div>

                        {showPaymentRequest ? (
                          <div className="mt-3 rounded-lg border border-dashed border-border bg-background p-3">
                            <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder={t('project.ticket.requestPaymentAmountEurPlaceholder')}
                                value={paymentDraft.amountEur}
                                onChange={(event) => setPaymentDraft(ticket.id, { amountEur: event.target.value })}
                              />
                              <Input
                                type="text"
                                placeholder={t('project.ticket.requestPaymentDescriptionPlaceholder')}
                                value={paymentDraft.description}
                                onChange={(event) => setPaymentDraft(ticket.id, { description: event.target.value })}
                              />
                              <Button type="button" size="sm" onClick={() => void requestPayment(ticket)}>
                                {t('project.ticket.requestPayment')}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}

            {pagination.total > 0 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('project.tickets.pagination.pageInfo', {
                    page: page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                  })}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-31.25">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {t('project.tickets.pagination.pageSize', { count: option })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {t('project.tickets.pagination.previous')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                  >
                    {t('project.tickets.pagination.next')}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  );
}
