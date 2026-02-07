'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, RotateCcw, XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project_id');

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Colored banner */}
        <div className="flex flex-col items-center bg-orange-50 px-6 pb-6 pt-10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 ring-4 ring-orange-50">
            <XCircle className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-semibold text-orange-900">
            {t('payments.cancel.title')}
          </h1>
        </div>

        <CardContent className="space-y-5 p-6">
          <p className="text-center text-sm text-muted-foreground">
            {t('payments.cancel.description')}
          </p>

          <Separator />

          <div className="flex flex-col gap-2">
            {projectId ? (
              <Button variant="secondary" className="w-full" asChild>
                <Link href={`/${locale}/projects/${projectId}/payments`}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('payments.cancel.tryAgain')}
                </Link>
              </Button>
            ) : null}
            <Button className="w-full" asChild>
              <Link href={`/${locale}/dashboard`}>
                {t('payments.cancel.back')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
