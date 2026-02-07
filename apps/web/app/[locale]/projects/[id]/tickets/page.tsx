'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TicketItem } from '@/lib/portal/types';

export default function ProjectTicketsPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, error, setError, isAdmin, request } = useProjectPageBase(locale, id);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});

  const loadTickets = useCallback(async () => {
    try {
      const data = await request<TicketItem[]>(`/tickets?projectId=${id}&limit=100`);
      setTickets(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadTickets();
  }, [loadTickets, project]);

  async function ticketAction(ticketId: string, action: string) {
    try {
      await request(`/tickets/${ticketId}/${action}`, { method: 'POST' });
      await loadTickets();
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }

  async function requestPayment(ticketId: string) {
    const amount = Number(paymentAmounts[ticketId] ?? '0');
    if (!Number.isFinite(amount) || amount < 1) {
      setError('PROJECT_LOAD_FAILED');
      return;
    }

    try {
      await request(`/tickets/${ticketId}/request-payment`, {
        method: 'POST',
        body: { priceCents: amount },
      });
      await loadTickets();
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }

  if (loading || !project) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell
      locale={locale}
      project={project}
      isAdmin={isAdmin}
      activeTab="tickets"
      headerAction={<Link className="btn-primary" href={`/${locale}/projects/${id}/tickets/new`}>{t('project.ticket.create')}</Link>}
    >
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="space-y-3">
        {tickets.length === 0 ? <p>{t('tickets.empty')}</p> : null}
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
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
                  <Button type="button" size="sm" variant="secondary" onClick={() => void ticketAction(ticket.id, 'convert-to-task')}>
                    {t('project.ticket.convert')}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder={t('project.ticket.paymentAmountPlaceholder')}
                    value={paymentAmounts[ticket.id] ?? ''}
                    onChange={(event) => setPaymentAmounts((previous) => ({ ...previous, [ticket.id]: event.target.value }))}
                  />
                  <Button type="button" size="sm" onClick={() => void requestPayment(ticket.id)}>
                    {t('project.ticket.requestPayment')}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </ProjectPageShell>
  );
}
