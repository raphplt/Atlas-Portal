'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from '@/components/providers/translation-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TicketActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'reject' | 'needs-info';
  ticketTitle: string;
  onConfirm: (reason: string) => Promise<void>;
}

export function TicketActionDialog({
  open,
  onOpenChange,
  action,
  ticketTitle,
  onConfirm,
}: TicketActionDialogProps) {
  const { t } = useTranslations();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const titleKey = action === 'reject' ? 'project.ticket.rejectTitle' : 'project.ticket.needsInfoTitle';
  const descKey = action === 'reject' ? 'project.ticket.rejectDescription' : 'project.ticket.needsInfoDescription';
  const confirmKey = action === 'reject' ? 'project.ticket.reject' : 'project.ticket.needsInfo';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setReason('');
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t(descKey)} <span className="font-medium text-foreground">{ticketTitle}</span>
        </p>
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <Label htmlFor="ticket-action-reason">{t('project.ticket.reasonLabel')}</Label>
            <Textarea
              id="ticket-action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('project.ticket.reasonPlaceholder')}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant={action === 'reject' ? 'destructive' : 'default'}
              disabled={submitting}
            >
              {t(confirmKey)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
