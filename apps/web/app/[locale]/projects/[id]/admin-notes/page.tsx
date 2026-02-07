'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateAdminNoteDialog } from '@/components/portal/dialogs/create-admin-note-dialog';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api-error';
import { AdminNoteItem } from '@/lib/portal/types';

export default function ProjectAdminNotesPage() {
  const { locale, projectId, project, error, setError, isAdmin, request } = useProjectContext();
  const { t } = useTranslations();
  const router = useRouter();

  const [notes, setNotes] = useState<AdminNoteItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.push(`/${locale}/projects/${projectId}/overview`);
    }
  }, [isAdmin, locale, projectId, router]);

  const loadNotes = useCallback(async () => {
    try {
      const data = await request<AdminNoteItem[]>(`/admin-notes?projectId=${projectId}`);
      setNotes(data);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.adminNote.loadError'));
    }
  }, [projectId, request, setError, t]);

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
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.adminNote.deleteError'));
    }
  }

  if (!project) return null;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>{t('project.adminNote.create')}</Button>
      </div>

      <CreateAdminNoteDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => void loadNotes()} />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {notes.length === 0 ? <p>{t('adminNotes.empty')}</p> : null}
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border border-border p-3">
            <p className="text-sm text-foreground">{note.content}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString(locale)}</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => void deleteNote(note.id)}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
