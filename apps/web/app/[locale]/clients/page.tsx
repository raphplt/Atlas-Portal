'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClientInvitationSummary,
  ClientSummary,
} from '@/lib/portal/types';
import {
  getClientDisplayName,
  getInitials,
  getInvitationBadgeVariant,
} from '@/lib/portal/client-utils';
import { Clock3, ExternalLink, UserPlus, Users } from 'lucide-react';

export default function ClientsPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [invitations, setInvitations] = useState<ClientInvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [clientsData, invitationsData] = await Promise.all([
        request<ClientSummary[]>('/users/clients?limit=100'),
        request<ClientInvitationSummary[]>('/invitations?limit=100'),
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

  const clientsByEmail = useMemo(
    () =>
      new Map(
        clients.map((client) => [client.email.toLowerCase(), client.id]),
      ),
    [clients],
  );

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <Users className="h-6 w-6 text-primary" />
            {t('clients.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('clients.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/clients/invite`}>
            <UserPlus className="h-4 w-4" />
            {t('clients.cta.invite')}
          </Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('project.loading')}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{t('clients.activeTitle')}</CardTitle>
            <CardDescription>{t('clients.activeDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 bg-muted/20">
            {!loading && clients.length === 0 ? <p>{t('clients.empty')}</p> : null}
            {clients.map((client) => (
              <Link
                key={client.id}
                className="group block rounded-xl border border-border/80 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/${locale}/clients/${client.id}`}
                aria-label={`${t('clients.openDetail')}: ${getClientDisplayName(client)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                    {getInitials(getClientDisplayName(client))}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-medium text-foreground">{getClientDisplayName(client)}</p>
                    <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      {t('clients.openDetail')}
                      <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{t('clients.invitationsTitle')}</CardTitle>
            <CardDescription>{t('clients.invitationsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 bg-muted/20">
            {!loading && invitations.length === 0 ? <p>{t('clients.invitationEmpty')}</p> : null}
            {invitations.map((invitation) => {
              const matchedClientId = clientsByEmail.get(
                invitation.email.toLowerCase(),
              );

              return (
                <div key={invitation.id} className="rounded-xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/35">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{invitation.email}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {t('clients.invitationExpires')}: {new Date(invitation.expiresAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <Badge variant={getInvitationBadgeVariant(invitation.status)}>{t(`status.invitation.${invitation.status}`)}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {invitation.status === 'PENDING' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => void handleRevokeInvitation(invitation.id)}
                    >
                      {t('clients.revoke')}
                    </Button>
                  ) : null}
                  {matchedClientId ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${locale}/clients/${matchedClientId}`}>
                        {t('clients.openDetail')}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
