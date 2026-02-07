'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreatePaymentDialog } from '@/components/portal/dialogs/create-payment-dialog';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api-error';
import { PaymentItem } from '@/lib/portal/types';
import { Banknote, CheckCircle2, CircleDashed, CreditCard, Clock, X } from 'lucide-react';

type StatusConfig = { icon: typeof CircleDashed; badge: string; accent: string };

const DEFAULT_STATUS: StatusConfig = { icon: CircleDashed, badge: '', accent: 'border-l-border' };

const STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: { icon: Clock, badge: 'bg-accent/10 text-accent', accent: 'border-l-accent' },
  PAID: { icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-800', accent: 'border-l-emerald-500' },
  CANCELED: { icon: X, badge: 'bg-muted text-muted-foreground', accent: 'border-l-muted-foreground/40' },
  EXPIRED: { icon: CircleDashed, badge: 'bg-muted text-muted-foreground', accent: 'border-l-muted-foreground/40' },
};

export default function ProjectPaymentsPage() {
  const { locale, projectId, project, error, setError, isAdmin, request } = useProjectContext();
  const { t } = useTranslations();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      const data = await request<PaymentItem[]>(`/payments?projectId=${projectId}&limit=100`);
      setPayments(data);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.payment.loadError'));
    }
  }, [projectId, request, setError, t]);

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
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.payment.checkoutError'));
    }
  }

  async function cancelPayment(paymentId: string) {
    try {
      await request(`/payments/${paymentId}/cancel`, { method: 'POST' });
      await loadPayments();
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.payment.cancelError'));
    }
  }

  if (!project) return null;

  const isCanceled = (s: string) => s === 'CANCELED' || s === 'EXPIRED';

  return (
    <>
      {isAdmin ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>{t('project.payment.create')}</Button>
        </div>
      ) : null}

      <CreatePaymentDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => void loadPayments()} />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Banknote className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t('payments.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const config = STATUS_CONFIG[payment.status] ?? DEFAULT_STATUS;
            const StatusIcon = config.icon;
            const canceled = isCanceled(payment.status);

            return (
              <div
                key={payment.id}
                className={`rounded-md border border-border border-l-4 p-4 transition-colors ${config.accent} ${canceled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium text-foreground ${canceled ? 'line-through' : ''}`}>
                        {payment.title}
                      </p>
                      {payment.description ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">{payment.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge className={config.badge}>{t(`status.payment.${payment.status}`)}</Badge>
                    <p className={`text-lg font-semibold tabular-nums ${canceled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {(payment.amountCents / 100).toLocaleString(locale, {
                        style: 'currency',
                        currency: payment.currency,
                      })}
                    </p>
                  </div>
                </div>

                {payment.status === 'PENDING' ? (
                  <div className="mt-3 flex gap-2 pl-11">
                    {!isAdmin ? (
                      <Button type="button" size="sm" onClick={() => void pay(payment.id)}>
                        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                        {t('project.payment.payNow')}
                      </Button>
                    ) : null}
                    {isAdmin ? (
                      <Button type="button" size="sm" variant="secondary" onClick={() => void cancelPayment(payment.id)}>
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        {t('project.payment.cancel')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
