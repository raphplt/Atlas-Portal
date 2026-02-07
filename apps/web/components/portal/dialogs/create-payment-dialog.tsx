'use client';

import { FormEvent, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePaymentDialog({ open, onOpenChange, onSuccess }: CreatePaymentDialogProps) {
  const { t } = useTranslations();
  const { request, projectId } = useProjectContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await request('/payments', {
        method: 'POST',
        body: {
          projectId,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          amountCents: Number(formData.get('amountCents') ?? 0),
        },
      });
      onSuccess();
      onOpenChange(false);
    } catch {
      setError(t('project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('project.payment.create')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <Label htmlFor="payment-title">{t('project.form.title')}</Label>
            <Input id="payment-title" name="title" required />
          </div>
          <div>
            <Label htmlFor="payment-description">{t('project.form.description')}</Label>
            <Textarea id="payment-description" name="description" />
          </div>
          <div>
            <Label htmlFor="payment-amount">{t('project.form.amount')}</Label>
            <Input id="payment-amount" name="amountCents" type="number" min={1} required />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>{t('project.payment.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
