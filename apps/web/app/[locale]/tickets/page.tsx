'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketItem } from '@/lib/portal/types';

export default function TicketsPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      setError(null);
      const data = await request<TicketItem[]>('/tickets?limit=100');
      setTickets(data);
    } catch {
      setError(t('tickets.error'));
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

    void loadTickets();
  }, [loadTickets, locale, ready, router, session]);

  return (
    <section className="space-y-6">
      <div>
        <h1>{t('tickets.title')}</h1>
        <p>{t('tickets.subtitle')}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('project.loading')}</p> : null}
      {!loading && tickets.length === 0 ? <p>{t('tickets.empty')}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{ticket.title}</CardTitle>
                <Badge>{t(`status.ticket.${ticket.status}`)}</Badge>
              </div>
              <CardDescription>{ticket.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--color-muted)]">{t(`status.ticketType.${ticket.type}`)}</p>
              <Link className="mt-2 inline-flex text-sm text-[var(--color-primary)] hover:underline" href={`/${locale}/projects/${ticket.projectId}/tickets`}>
                {t('tickets.openProjectTickets')}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
