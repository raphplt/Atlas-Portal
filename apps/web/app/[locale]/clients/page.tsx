'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientSummary } from '@/lib/portal/types';

interface InvitationSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function ClientsPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [clientsData, invitationsData] = await Promise.all([
        request<ClientSummary[]>('/users/clients?limit=100'),
        request<InvitationSummary[]>('/invitations?limit=100'),
      ]);

      setClients(clientsData);
      setInvitations(invitationsData);
    } catch {
      setError(t('clients.error'));
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
      router.push(`/${locale}/dashboard`);
      return;
    }

    void loadData();
  }, [loadData, locale, ready, router, session]);

  async function handleRevokeInvitation(invitationId: string) {
    try {
      await request(`/invitations/${invitationId}/revoke`, { method: 'POST' });
      await loadData();
    } catch {
      setError(t('clients.revokeError'));
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{t('clients.title')}</h1>
          <p>{t('clients.subtitle')}</p>
        </div>
        <Link className="btn-primary" href={`/${locale}/clients/invite`}>
          {t('clients.cta.invite')}
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('project.loading')}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('clients.activeTitle')}</CardTitle>
            <CardDescription>{t('clients.activeDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && clients.length === 0 ? <p>{t('clients.empty')}</p> : null}
            {clients.map((client) => (
              <div key={client.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <p className="font-medium text-[var(--color-foreground)]">
                  {[client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.email}
                </p>
                <p className="text-xs text-[var(--color-muted)]">{client.email}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('clients.invitationsTitle')}</CardTitle>
            <CardDescription>{t('clients.invitationsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && invitations.length === 0 ? <p>{t('clients.invitationEmpty')}</p> : null}
            {invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium text-[var(--color-foreground)]">{invitation.email}</p>
                  <Badge>{t(`status.invitation.${invitation.status}`)}</Badge>
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  {t('clients.invitationExpires')}: {new Date(invitation.expiresAt).toLocaleDateString(locale)}
                </p>
                {invitation.status === 'PENDING' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => void handleRevokeInvitation(invitation.id)}
                  >
                    {t('clients.revoke')}
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
