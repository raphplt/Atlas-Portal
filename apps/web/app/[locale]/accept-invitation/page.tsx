'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { anonymousRequest } from '@/lib/auth/api-client';
import { SessionState } from '@/lib/auth/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PublicInvitationPayload {
  id: string;
  workspaceName: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale: string;
  expiresAt: string;
}

export default function AcceptInvitationPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { setSession } = useAuth();
  const { t } = useTranslations();

  const [invitation, setInvitation] = useState<PublicInvitationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(t('invitation.invalid'));
      return;
    }

    void (async () => {
      try {
        const payload = await anonymousRequest<PublicInvitationPayload>(
          `/invitations/public/${encodeURIComponent(token)}`,
          'GET',
        );
        setInvitation(payload);
      } catch {
        setError(t('invitation.invalid'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t, token]);

  const defaultLocale = useMemo(() => {
    if (!invitation?.locale) {
      return locale;
    }
    return invitation.locale.toLowerCase() === 'en' ? 'en' : 'fr';
  }, [invitation?.locale, locale]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError(t('invitation.invalid'));
      return;
    }

    const formData = new FormData(event.currentTarget);

    setSubmitting(true);
    setError(null);

    try {
      const result = await anonymousRequest<{ user: SessionState['user']; workspace?: SessionState['workspace'] }>(
        `/invitations/public/${encodeURIComponent(token)}/accept`,
        'POST',
        {
          password: String(formData.get('password') ?? ''),
          firstName: String(formData.get('firstName') ?? ''),
          lastName: String(formData.get('lastName') ?? ''),
          locale: String(formData.get('locale') ?? defaultLocale),
        },
      );

      setSession({ user: result.user, workspace: result.workspace });
      router.push(`/${locale}/dashboard`);
    } catch {
      setError(t('invitation.acceptError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('invitation.title')}</CardTitle>
          <CardDescription>{t('invitation.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p>{t('project.loading')}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && invitation ? (
            <>
              <div className="rounded-md border border-border bg-secondary p-4 text-sm">
                <p>
                  <strong>{t('invitation.workspace')}:</strong> {invitation.workspaceName}
                </p>
                <p>
                  <strong>{t('invitation.email')}:</strong> {invitation.email}
                </p>
                <p>
                  <strong>{t('invitation.expiresAt')}:</strong>{' '}
                  {new Date(invitation.expiresAt).toLocaleString(locale)}
                </p>
              </div>

              <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
                <div>
                  <Label htmlFor="accept-first-name">{t('clients.form.firstName')}</Label>
                  <Input
                    id="accept-first-name"
                    name="firstName"
                    defaultValue={invitation.firstName ?? ''}
                  />
                </div>
                <div>
                  <Label htmlFor="accept-last-name">{t('clients.form.lastName')}</Label>
                  <Input
                    id="accept-last-name"
                    name="lastName"
                    defaultValue={invitation.lastName ?? ''}
                  />
                </div>
                <div>
                  <Label htmlFor="accept-locale">{t('clients.form.locale')}</Label>
                  <select id="accept-locale" name="locale" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm" defaultValue={defaultLocale}>
                    <option value="fr">FR</option>
                    <option value="en">EN</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="accept-password">{t('invitation.password')}</Label>
                  <Input id="accept-password" name="password" type="password" minLength={12} required />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={submitting}>
                    {t('invitation.submit')}
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
