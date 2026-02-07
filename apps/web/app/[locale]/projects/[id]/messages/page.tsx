'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { MessageItem } from '@/lib/portal/types';

export default function ProjectMessagesPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const { project, loading, error, setError, isAdmin, request } = useProjectPageBase(locale, id);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await request<MessageItem[]>(`/messages?projectId=${id}&limit=100`);
      setMessages(data.slice().reverse());
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadMessages();
  }, [loadMessages, project]);

  if (loading || !project) {
    return <p>{t('project.loading')}</p>;
  }

  return (
    <ProjectPageShell
      locale={locale}
      project={project}
      isAdmin={isAdmin}
      activeTab="messages"
      headerAction={<Link className="btn-primary" href={`/${locale}/projects/${id}/messages/new`}>{t('project.message.send')}</Link>}
    >
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="space-y-3">
        {messages.length === 0 ? <p>{t('messages.empty')}</p> : null}
        {messages.map((message) => (
          <div key={message.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
            <p className="text-sm text-[var(--color-foreground)]">{message.body}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{new Date(message.createdAt).toLocaleString(locale)}</p>
          </div>
        ))}
      </div>
    </ProjectPageShell>
  );
}
