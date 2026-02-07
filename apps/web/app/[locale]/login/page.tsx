'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Languages, LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslations();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const alternateLocale = locale === 'fr' ? 'en' : 'fr';
  const alternatePath = pathname?.startsWith(`/${locale}`)
    ? pathname.replace(`/${locale}`, `/${alternateLocale}`)
    : `/${alternateLocale}/login`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setPending(true);
    setError(null);

    try {
      await login({ email, password });
      router.push(`/${locale}/dashboard`);
    } catch {
      setError(t('auth.error'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-dot-pattern flex min-h-svh items-center justify-center px-4 py-12">
      {/* Language switcher — top right */}
      <Link
        href={alternatePath}
        className="fixed right-4 top-4 z-10 flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        <Languages className="h-3.5 w-3.5" />
        {alternateLocale.toUpperCase()}
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo + branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/Logo.png" alt={t('app.title')} width={40} height={40} />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t('app.title')}
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {t('auth.login.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('auth.login.description')}
            </p>
          </div>

          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nom@exemple.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {t('auth.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
