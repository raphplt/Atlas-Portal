'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { AdminNoteItem } from '@/lib/portal/types';

export default function ProjectAdminNotesPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, error, setError, isAdmin, request } = useProjectPageBase(locale, id, {
    adminOnly: true,
  });
  const [notes, setNotes] = useState<AdminNoteItem[]>([]);

  const loadNotes = useCallback(async () => {
    try {
      const data = await request<AdminNoteItem[]>(`/admin-notes?projectId=${id}`);
      setNotes(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project || !isAdmin) {
      return;
    }
    void loadNotes();
  }, [isAdmin, loadNotes, project]);

  async function deleteNote(noteId: string) {
    try {
      await request(`/admin-notes/${noteId}`, { method: 'DELETE' });
      await loadNotes();
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }

  if (loading || !project || !isAdmin) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell
      locale={locale}
      project={project}
      isAdmin={isAdmin}
      activeTab="admin-notes"
      headerAction={<Link className="btn-primary" href={`/${locale}/projects/${id}/admin-notes/new`}>{t('project.adminNote.create')}</Link>}
    >
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="space-y-3">
        {notes.length === 0 ? <p>{t('adminNotes.empty')}</p> : null}
        {notes.map((note) => (
          <div key={note.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
            <p className="text-sm text-[var(--color-foreground)]">{note.content}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--color-muted)]">{new Date(note.createdAt).toLocaleString(locale)}</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => void deleteNote(note.id)}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ProjectPageShell>
  );
}
