'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { FileItem } from '@/lib/portal/types';

export default function ProjectFilesPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, error, setError, isAdmin, request } = useProjectPageBase(locale, id);
  const [files, setFiles] = useState<FileItem[]>([]);

  const loadFiles = useCallback(async () => {
    try {
      const data = await request<FileItem[]>(`/files?projectId=${id}&limit=100`);
      setFiles(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadFiles();
  }, [loadFiles, project]);

  async function downloadFile(fileId: string) {
    try {
      const payload = await request<{ downloadUrl: string }>(`/files/${fileId}/download-url`);
      window.open(payload.downloadUrl, '_blank', 'noopener,noreferrer');
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
      activeTab="files"
      headerAction={<Link className="btn-primary" href={`/${locale}/projects/${id}/files/new`}>{t('project.file.upload')}</Link>}
    >
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="space-y-3">
        {files.length === 0 ? <p>{t('files.empty')}</p> : null}
        {files.map((file) => (
          <div key={file.id} className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--color-border)] p-3">
            <div>
              <p className="font-medium text-[var(--color-foreground)]">{file.originalName}</p>
              <p className="text-xs text-[var(--color-muted)]">{t(`status.file.${file.category}`)}</p>
            </div>
            {file.isUploaded ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => void downloadFile(file.id)}>
                {t('project.file.download')}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </ProjectPageShell>
  );
}
