'use client';

import { FormEvent, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;

const selectClasses = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTaskDialog({ open, onOpenChange, onSuccess }: CreateTaskDialogProps) {
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
      await request('/tasks', {
        method: 'POST',
        body: {
          projectId,
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          status: String(formData.get('status') ?? 'BACKLOG'),
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
          <DialogTitle>{t('project.task.create')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <Label htmlFor="task-title">{t('project.form.title')}</Label>
            <Input id="task-title" name="title" required />
          </div>
          <div>
            <Label htmlFor="task-description">{t('project.form.description')}</Label>
            <Textarea id="task-description" name="description" />
          </div>
          <div>
            <Label htmlFor="task-status">{t('project.form.status')}</Label>
            <select id="task-status" name="status" className={selectClasses} defaultValue="BACKLOG">
              {STATUSES.map((status) => (
                <option key={status} value={status}>{t(`status.task.${status}`)}</option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>{t('project.task.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
