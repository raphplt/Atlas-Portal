'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { useProjectSocket } from '@/hooks/use-project-socket';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/api-error';
import { MessageItem } from '@/lib/portal/types';
import { Send } from 'lucide-react';

export default function ProjectMessagesPage() {
  const { locale, projectId, project, error, setError, request } =
    useProjectContext();
  const { t } = useTranslations();
  const { session } = useAuth();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await request<MessageItem[]>(
        `/messages?projectId=${projectId}&limit=100`,
      );
      setMessages(data.slice().reverse());
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.message.loadError'));
    }
  }, [projectId, request, setError, t]);

  // Initial load
  useEffect(() => {
    if (!project) return;
    void loadMessages();
  }, [loadMessages, project]);

  // WebSocket: receive new messages in real time
  useProjectSocket({
    projectId,
    enabled: !!project,
    onNewMessage: useCallback(
      (message: MessageItem) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      },
      [],
    ),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    try {
      await request('/messages', {
        method: 'POST',
        body: { projectId: projectId, body: body.trim() },
      });
      setBody('');
      // The new message will arrive via WebSocket — no need to refetch
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.message.sendError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!project) return null;

  const currentUserId = session?.user.id;

  return (
    <>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div
        className="flex flex-col rounded-md border border-border overflow-hidden"
        style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}
      >
        {/* Messages scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t('messages.empty')}
            </p>
          ) : null}
          {messages.map((message) => {
            const isMine = message.authorId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMine ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                >
                  <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}
                  >
                    {new Date(message.createdAt).toLocaleString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline composer */}
        <form
          onSubmit={(e) => void handleSend(e)}
          className="border-t border-border p-3 flex gap-2 items-end bg-background"
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('project.form.message')}
            className="flex-1 resize-none text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend(e);
              }
            }}
          />
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
