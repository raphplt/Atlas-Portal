'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api-error';
import { TaskChecklistItem } from '@/lib/portal/types';
import { CheckSquare, Plus, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskChecklistProps {
  taskId: string;
  isAdmin: boolean;
}

export function TaskChecklist({ taskId, isAdmin }: TaskChecklistProps) {
  const { t } = useTranslations();
  const { request } = useProjectContext();
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await request<TaskChecklistItem[]>(`/tasks/${taskId}/checklist`);
      setItems(data);
    } catch (e) {
      toast.error(getErrorMessage(e, t, 'project.task.checklistLoadError'));
    } finally {
      setLoading(false);
    }
  }, [taskId, request, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleItem(item: TaskChecklistItem) {
    // Optimistic
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i)),
    );
    try {
      await request(`/tasks/${taskId}/checklist/${item.id}`, {
        method: 'PATCH',
        body: { completed: !item.completed },
      });
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, completed: item.completed } : i)),
      );
    }
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await request<TaskChecklistItem>(`/tasks/${taskId}/checklist`, {
        method: 'POST',
        body: { title: newTitle.trim() },
      });
      setItems((prev) => [...prev, created]);
      setNewTitle('');
    } catch (e) {
      toast.error(getErrorMessage(e, t, 'project.task.checklistAddError'));
    }
  }

  async function removeItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await request(`/tasks/${taskId}/checklist/${itemId}`, {
        method: 'DELETE',
      });
    } catch {
      void load();
    }
  }

  const doneCount = items.filter((i) => i.completed).length;

  if (loading) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">
          {t('project.task.checklist')}
        </h4>
        {items.length > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {doneCount}/{items.length}
          </span>
        ) : null}
      </div>

      {/* Progress bar */}
      {items.length > 0 ? (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      ) : null}

      {/* Items */}
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/50">
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => void toggleItem(item)}
              disabled={!isAdmin}
            >
              {item.completed ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {item.title}
            </span>
            {isAdmin ? (
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                onClick={() => void removeItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Add item */}
      {isAdmin ? (
        <form onSubmit={(e) => void addItem(e)} className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('project.task.addChecklistItem')}
            className="h-8 text-sm"
          />
          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      ) : null}

      {items.length === 0 && !isAdmin ? (
        <p className="text-xs text-muted-foreground">{t('project.task.noChecklist')}</p>
      ) : null}
    </div>
  );
}
