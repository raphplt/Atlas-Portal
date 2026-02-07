'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';

export default function PaymentSuccessPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const { t } = useTranslations();

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Colored banner */}
        <div className="flex flex-col items-center bg-emerald-50 px-6 pb-6 pt-10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-emerald-900">
            {t('payments.success.title')}
          </h1>
          <p className="mt-1 text-sm text-emerald-700">
            {t('payments.success.subtitle')}
          </p>
        </div>

        <CardContent className="space-y-5 p-6">
          <p className="text-center text-sm text-muted-foreground">
            {t('payments.success.description')}
          </p>

          <Separator />

          <div className="flex items-start gap-3 rounded-md bg-muted/40 p-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {t('payments.success.receiptNote')}
            </p>
          </div>

          <Button className="w-full" asChild>
            <Link href={`/${locale}/dashboard`}>
              {t('payments.success.back')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
