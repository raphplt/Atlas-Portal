'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api-error';
import { TicketItem } from '@/lib/portal/types';

const STATUS_BADGE_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  NEEDS_INFO: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  PAYMENT_REQUIRED: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
};

const STATUSES = ['OPEN', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'PAYMENT_REQUIRED', 'PAID', 'CONVERTED'];
const TYPES = ['QUESTION', 'BUG', 'MODIFICATION', 'IMPROVEMENT'];

export default function TicketsPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const loadTickets = useCallback(async () => {
    try {
      setError(null);
      const qs = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      if (typeFilter !== 'ALL') qs.set('type', typeFilter);
      const data = await request<TicketItem[]>(`/tickets?${qs.toString()}`);
      setTickets(data);
    } catch (e) {
      setError(getErrorMessage(e, t, 'tickets.error'));
    } finally {
      setLoading(false);
    }
  }, [request, t, statusFilter, typeFilter]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }
    void loadTickets();
  }, [loadTickets, locale, ready, router, session]);

  return (
    <section className="space-y-6">
      <div>
        <div>
          <h1 className="text-2xl font-semibold">{t('tickets.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('tickets.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
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

        <Button asChild className="w-full sm:w-auto lg:shrink-0">
          <Link href={`/${locale}/tickets/new`}>
            {t('tickets.createGlobal')}
          </Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('project.loading')}</p> : null}
      {!loading && tickets.length === 0 ? <p>{t('tickets.empty')}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {tickets.map((ticket) => {
          const badgeColor = STATUS_BADGE_COLORS[ticket.status] ?? '';
          return (
            <Card key={ticket.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{ticket.title}</CardTitle>
                  <Badge className={badgeColor}>{t(`status.ticket.${ticket.status}`)}</Badge>
                </div>
                <CardDescription>{ticket.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{t(`status.ticketType.${ticket.type}`)}</p>
                {ticket.requiresPayment && ticket.priceCents ? (
                  <p className="mt-1 text-sm font-medium">
                    {(ticket.priceCents / 100).toLocaleString(locale, { style: 'currency', currency: 'EUR' })}
                  </p>
                ) : null}
                <Link className="mt-2 inline-flex text-sm text-primary hover:underline" href={`/${locale}/projects/${ticket.projectId}/tickets`}>
                  {t('tickets.openProjectTickets')}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
