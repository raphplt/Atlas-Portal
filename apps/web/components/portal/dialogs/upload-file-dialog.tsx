'use client';

import { FormEvent, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClasses = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UploadFileDialog({ open, onOpenChange, onSuccess }: UploadFileDialogProps) {
  const { t } = useTranslations();
  const { request, projectId } = useProjectContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const uploadedFile = formData.get('file');

    if (!(uploadedFile instanceof File)) {
      setError(t('project.file.invalidFile'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const uploadMeta = await request<{ fileId: string; uploadUrl: string }>('/files/upload-url', {
        method: 'POST',
        body: {
          projectId,
          originalName: uploadedFile.name,
          contentType: uploadedFile.type || 'application/octet-stream',
          sizeBytes: uploadedFile.size,
          category: String(formData.get('category') ?? 'OTHER'),
        },
      });

      const uploadResponse = await fetch(uploadMeta.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': uploadedFile.type || 'application/octet-stream' },
        body: uploadedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      await request(`/files/${uploadMeta.fileId}/complete`, {
        method: 'POST',
        body: {},
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
          <DialogTitle>{t('project.file.upload')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <Label htmlFor="file-input">{t('project.file.select')}</Label>
            <Input id="file-input" name="file" type="file" required />
          </div>
          <div>
            <Label htmlFor="file-category">{t('project.file.category')}</Label>
            <select id="file-category" name="category" className={selectClasses} defaultValue="OTHER">
              <option value="BRANDING">{t('status.file.BRANDING')}</option>
              <option value="CONTENT">{t('status.file.CONTENT')}</option>
              <option value="DELIVERABLE">{t('status.file.DELIVERABLE')}</option>
              <option value="OTHER">{t('status.file.OTHER')}</option>
            </select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>{t('project.file.upload')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
