'use client';

import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { TaskItem } from '@/lib/portal/types';
import { Plus } from 'lucide-react';
import { TaskCard } from './task-card';

const STATUS_DOT: Record<string, string> = {
  BACKLOG: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  BLOCKED_BY_CLIENT: 'bg-orange-500',
  DONE: 'bg-emerald-500',
};

interface KanbanColumnProps {
  status: string;
  tasks: TaskItem[];
  isAdmin: boolean;
  ticketByTaskId: Record<string, string>;
  projectId: string;
  locale: string;
  highlightedTaskId: string | null;
  onTaskClick: (task: TaskItem) => void;
  onTaskDelete?: (taskId: string) => void;
  onAddTask?: (status: string) => void;
}

export function KanbanColumn({
  status,
  tasks,
  isAdmin,
  ticketByTaskId,
  projectId,
  locale,
  highlightedTaskId,
  onTaskClick,
  onTaskDelete,
  onAddTask,
}: KanbanColumnProps) {
  const { t } = useTranslations();
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: 'column' },
    disabled: true,
  });

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[status] ?? 'bg-slate-400'}`} />
        <h3 className="text-sm font-semibold text-foreground truncate">
          {t(`status.task.${status}`)}
        </h3>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
        {isAdmin && onAddTask ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={() => onAddTask(status)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                {t('tasks.emptyStatus')}
              </p>
            </div>
          ) : null}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              linkedTicketId={ticketByTaskId[task.id]}
              projectId={projectId}
              locale={locale}
              isHighlighted={highlightedTaskId === task.id}
              onClick={() => onTaskClick(task)}
              onDelete={isAdmin && !task.milestoneType ? onTaskDelete : undefined}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
