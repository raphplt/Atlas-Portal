'use client';

import { FormEvent, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateAdminNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAdminNoteDialog({ open, onOpenChange, onSuccess }: CreateAdminNoteDialogProps) {
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
      await request('/admin-notes', {
        method: 'POST',
        body: {
          projectId,
          content: String(formData.get('content') ?? ''),
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
          <DialogTitle>{t('project.adminNote.create')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <Label htmlFor="admin-note-content">{t('project.adminNote.content')}</Label>
            <Textarea id="admin-note-content" name="content" required />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>{t('project.adminNote.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
