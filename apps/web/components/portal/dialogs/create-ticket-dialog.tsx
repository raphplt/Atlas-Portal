'use client';

import { FormEvent, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const TYPES = ['QUESTION', 'BUG', 'MODIFICATION', 'IMPROVEMENT'] as const;

const selectClasses = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTicketDialog({ open, onOpenChange, onSuccess }: CreateTicketDialogProps) {
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
      await request('/tickets', {
        method: 'POST',
        body: {
          projectId,
          type: String(formData.get('type') ?? 'QUESTION'),
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
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
          <DialogTitle>{t('project.ticket.create')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <Label htmlFor="ticket-type">{t('project.form.type')}</Label>
            <select id="ticket-type" name="type" className={selectClasses} defaultValue="QUESTION">
              {TYPES.map((type) => (
                <option key={type} value={type}>{t(`status.ticketType.${type}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ticket-title">{t('project.form.title')}</Label>
            <Input id="ticket-title" name="title" required />
          </div>
          <div>
            <Label htmlFor="ticket-description">{t('project.form.description')}</Label>
            <Textarea id="ticket-description" name="description" required />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>{t('project.ticket.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
