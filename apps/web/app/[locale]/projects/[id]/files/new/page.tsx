'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewFilePage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, isAdmin, request, router } = useProjectPageBase(locale, id);
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
          projectId: id,
          originalName: uploadedFile.name,
          contentType: uploadedFile.type || 'application/octet-stream',
          sizeBytes: uploadedFile.size,
          category: String(formData.get('category') ?? 'OTHER'),
        },
      });

      const uploadResponse = await fetch(uploadMeta.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': uploadedFile.type || 'application/octet-stream',
        },
        body: uploadedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      await request(`/files/${uploadMeta.fileId}/complete`, {
        method: 'POST',
        body: {},
      });

      router.push(`/${locale}/projects/${id}/files`);
    } catch {
      setError(t('project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !project) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell locale={locale} project={project} isAdmin={isAdmin} activeTab="files">
      <Card>
        <CardHeader>
          <CardTitle>{t('project.file.upload')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <Label htmlFor="file-input">{t('project.file.select')}</Label>
              <Input id="file-input" name="file" type="file" required />
            </div>
            <div>
              <Label htmlFor="file-category">{t('project.file.category')}</Label>
              <select id="file-category" name="category" className="input-base" defaultValue="OTHER">
                <option value="BRANDING">{t('status.file.BRANDING')}</option>
                <option value="CONTENT">{t('status.file.CONTENT')}</option>
                <option value="DELIVERABLE">{t('status.file.DELIVERABLE')}</option>
                <option value="OTHER">{t('status.file.OTHER')}</option>
              </select>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{t('project.file.upload')}</Button>
              <Link className="btn-secondary" href={`/${locale}/projects/${id}/files`}>{t('common.cancel')}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProjectPageShell>
  );
}
