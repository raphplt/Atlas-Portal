'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClientSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale: string;
  createdAt: string;
}

interface InvitationSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitationUrl?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvitationUrl, setLastInvitationUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

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

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    setError(null);
    setCopyState('idle');

    try {
      const invitation = await request<InvitationSummary>('/invitations', {
        method: 'POST',
        body: {
          email: String(formData.get('email') ?? ''),
          firstName: String(formData.get('firstName') ?? ''),
          lastName: String(formData.get('lastName') ?? ''),
          locale: String(formData.get('locale') ?? 'fr'),
        },
      });

      form.reset();
      setError(null);
      setLastInvitationUrl(invitation.invitationUrl ?? null);
      await loadData();
    } catch {
      setError(t('clients.inviteError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    try {
      await request(`/invitations/${invitationId}/revoke`, { method: 'POST' });
      await loadData();
    } catch {
      setError(t('clients.revokeError'));
    }
  }

  async function copyInvitationUrl() {
    if (!lastInvitationUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lastInvitationUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <h1>{t('clients.title')}</h1>
        <p>{t('clients.subtitle')}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('clients.inviteTitle')}</CardTitle>
          <CardDescription>{t('clients.inviteDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleInvite(event)}>
            <div>
              <Label htmlFor="invite-email">{t('clients.form.email')}</Label>
              <Input id="invite-email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="invite-locale">{t('clients.form.locale')}</Label>
              <select id="invite-locale" name="locale" className="input-base" defaultValue={locale}>
                <option value="fr">FR</option>
                <option value="en">EN</option>
              </select>
            </div>
            <div>
              <Label htmlFor="invite-first-name">{t('clients.form.firstName')}</Label>
              <Input id="invite-first-name" name="firstName" />
            </div>
            <div>
              <Label htmlFor="invite-last-name">{t('clients.form.lastName')}</Label>
              <Input id="invite-last-name" name="lastName" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={submitting}>
                {t('clients.form.submit')}
              </Button>
            </div>
          </form>

          {lastInvitationUrl ? (
            <div className="mt-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-background-alt)] p-3">
              <p className="text-xs text-[var(--color-muted)]">{t('clients.latestInvitation')}</p>
              <p className="mt-1 break-all text-sm text-[var(--color-foreground)]">{lastInvitationUrl}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => void copyInvitationUrl()}>
                  {t('clients.copyLink')}
                </Button>
                {copyState === 'copied' ? <span className="text-xs text-green-600">{t('clients.copied')}</span> : null}
                {copyState === 'failed' ? <span className="text-xs text-red-600">{t('clients.copyFailed')}</span> : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('clients.activeTitle')}</CardTitle>
            <CardDescription>{t('clients.activeDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p>{t('project.loading')}</p> : null}
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
            {loading ? <p>{t('project.loading')}</p> : null}
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
