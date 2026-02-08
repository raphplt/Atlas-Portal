'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { TaskItem } from '@/lib/portal/types';
import {
  Calendar,
  CheckSquare,
  Flag,
  GripVertical,
  Link2,
  MoreHorizontal,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const STATUS_DOT: Record<string, string> = {
  BACKLOG: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  BLOCKED_BY_CLIENT: 'bg-orange-500',
  DONE: 'bg-emerald-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
  URGENT: 'bg-red-200 text-red-900',
};

interface TaskCardProps {
  task: TaskItem;
  isAdmin: boolean;
  linkedTicketId?: string;
  projectId: string;
  locale: string;
  isHighlighted: boolean;
  onClick: () => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({
  task,
  isAdmin,
  linkedTicketId,
  isHighlighted,
  onClick,
  onDelete,
}: TaskCardProps) {
  const { t } = useTranslations();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isMilestone = task.source === 'MILESTONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      id={`task-${task.id}`}
      className={`group rounded-lg border bg-background p-3 shadow-sm transition-all hover:shadow-md ${
        isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isHighlighted ? 'ring-2 ring-primary/40' : ''} ${
        isMilestone ? 'border-accent/40 bg-accent/3' : 'border-border'
      }`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      role="button"
      tabIndex={0}
    >
      {/* Header: status + menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {isAdmin ? (
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : null}
          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[task.status] ?? 'bg-slate-400'}`} />
          <span className="text-[11px] font-medium text-muted-foreground">
            {t(`status.task.${task.status}`)}
          </span>
        </div>

        {isAdmin && !isMilestone ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                <Pencil className="h-3.5 w-3.5" /> {t('project.task.edit')}
              </button>
              {onDelete ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
                </button>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {isMilestone ? (
          <Badge className="bg-accent/15 text-accent text-[10px] gap-1 px-1.5 py-0">
            <Flag className="h-2.5 w-2.5" />
            {t(`status.milestone.${task.milestoneType}`)}
          </Badge>
        ) : (
          <Badge className="text-[10px] px-1.5 py-0">
            {t(`status.taskSource.${task.source}`)}
          </Badge>
        )}
        {task.priority ? (
          <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority] ?? ''}`}>
            {t(`status.taskPriority.${task.priority}`)}
          </Badge>
        ) : null}
      </div>

      {/* Title */}
      <p className="font-medium text-foreground text-sm leading-snug">
        {isMilestone ? t(`status.milestone.${task.milestoneType}`) : task.title}
      </p>

      {/* Description */}
      {task.description ? (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      ) : null}

      {/* Blocked reason */}
      {task.blockedReason ? (
        <p className="mt-1 text-xs text-orange-600">{task.blockedReason}</p>
      ) : null}

      {/* Footer: due date, checklist, link */}
      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        ) : null}

        {task.checklistTotal > 0 ? (
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            {task.checklistDone}/{task.checklistTotal}
          </span>
        ) : null}

        {linkedTicketId ? (
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TaskCardOverlay({ task }: { task: TaskItem }) {
  const { t } = useTranslations();
  const isMilestone = task.source === 'MILESTONE';

  return (
    <div className={`rounded-lg border bg-background p-3 shadow-lg rotate-2 ${isMilestone ? 'border-accent/40' : 'border-border'}`}>
      <p className="font-medium text-foreground text-sm">
        {isMilestone ? t(`status.milestone.${task.milestoneType}`) : task.title}
      </p>
      <Badge className="mt-1 text-[10px]">
        {isMilestone ? t(`status.taskSource.MILESTONE`) : t(`status.taskSource.${task.source}`)}
      </Badge>
    </div>
  );
}
