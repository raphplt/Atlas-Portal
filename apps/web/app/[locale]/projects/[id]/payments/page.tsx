'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaymentItem } from '@/lib/portal/types';

export default function ProjectPaymentsPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, error, setError, isAdmin, request } = useProjectPageBase(locale, id);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const loadPayments = useCallback(async () => {
    try {
      const data = await request<PaymentItem[]>(`/payments?projectId=${id}&limit=100`);
      setPayments(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadPayments();
  }, [loadPayments, project]);

  async function pay(paymentId: string) {
    try {
      const payload = await request<{ url: string }>(`/payments/${paymentId}/checkout-session`, {
        method: 'POST',
      });
      window.location.href = payload.url;
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }

  if (loading || !project) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell
      locale={locale}
      project={project}
      isAdmin={isAdmin}
      activeTab="payments"
      headerAction={
        isAdmin ? <Link className="btn-primary" href={`/${locale}/projects/${id}/payments/new`}>{t('project.payment.create')}</Link> : null
      }
    >
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="space-y-3">
        {payments.length === 0 ? <p>{t('payments.empty')}</p> : null}
        {payments.map((payment) => (
          <div key={payment.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-medium text-[var(--color-foreground)]">{payment.title}</p>
              <Badge>{t(`status.payment.${payment.status}`)}</Badge>
            </div>
            {payment.description ? <p className="text-sm text-[var(--color-muted)]">{payment.description}</p> : null}
            <p className="mt-1 text-sm text-[var(--color-foreground)]">
              {(payment.amountCents / 100).toLocaleString(locale, { style: 'currency', currency: payment.currency })}
            </p>
            {payment.status === 'PENDING' ? (
              <Button type="button" size="sm" className="mt-2" onClick={() => void pay(payment.id)}>
                {t('project.payment.payNow')}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </ProjectPageShell>
  );
}
