'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InvitationResponse {
  invitationUrl?: string;
}

export default function InviteClientPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

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
    }
  }, [locale, ready, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    setError(null);
    setCopyState('idle');

    try {
      const payload = await request<InvitationResponse>('/invitations', {
        method: 'POST',
        body: {
          email: String(formData.get('email') ?? ''),
          firstName: String(formData.get('firstName') ?? ''),
          lastName: String(formData.get('lastName') ?? ''),
          locale: String(formData.get('locale') ?? 'fr'),
        },
      });

      setInvitationUrl(payload.invitationUrl ?? null);
      form.reset();
    } catch {
      setError(t('clients.inviteError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!invitationUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link href={`/${locale}/clients`} className="text-sm text-[var(--color-muted)] hover:underline">
          {t('clients.back')}
        </Link>
        <h1>{t('clients.inviteTitle')}</h1>
        <p>{t('clients.inviteDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('clients.inviteTitle')}</CardTitle>
          <CardDescription>{t('clients.inviteDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
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
              <Label htmlFor="invite-firstName">{t('clients.form.firstName')}</Label>
              <Input id="invite-firstName" name="firstName" />
            </div>
            <div>
              <Label htmlFor="invite-lastName">{t('clients.form.lastName')}</Label>
              <Input id="invite-lastName" name="lastName" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={submitting}>
                {t('clients.form.submit')}
              </Button>
              <Link href={`/${locale}/clients`} className="btn-secondary">
                {t('common.cancel')}
              </Link>
            </div>
          </form>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          {invitationUrl ? (
            <div className="mt-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-background-alt)] p-3">
              <p className="text-xs text-[var(--color-muted)]">{t('clients.latestInvitation')}</p>
              <p className="mt-1 break-all text-sm text-[var(--color-foreground)]">{invitationUrl}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => void copyLink()}>
                  {t('clients.copyLink')}
                </Button>
                {copyState === 'copied' ? <span className="text-xs text-green-600">{t('clients.copied')}</span> : null}
                {copyState === 'failed' ? <span className="text-xs text-red-600">{t('clients.copyFailed')}</span> : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
