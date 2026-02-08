'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/portal/dialogs/confirm-dialog';
import { CreateTaskDialog } from '@/components/portal/dialogs/create-task-dialog';
import { KanbanColumn } from '@/components/portal/tasks/kanban-column';
import { TaskCardOverlay } from '@/components/portal/tasks/task-card';
import { TaskDetailSheet } from '@/components/portal/tasks/task-detail-sheet';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api-error';
import { TaskItem, TicketItem } from '@/lib/portal/types';
import { toast } from 'sonner';

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;
type Status = (typeof STATUSES)[number];

export default function ProjectTasksPage() {
  const { locale, projectId, project, error, setError, isAdmin, request } =
    useProjectContext();
  const { t } = useTranslations();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [ticketByTaskId, setTicketByTaskId] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<string | undefined>();
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const pendingReorder = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const loadTasks = useCallback(async () => {
    try {
      const [tasksData, ticketsData] = await Promise.all([
        request<TaskItem[]>(`/tasks?projectId=${projectId}&limit=100`),
        request<TicketItem[]>(`/tickets?projectId=${projectId}&limit=100`),
      ]);
      setTasks(tasksData);
      const nextTicketByTaskId: Record<string, string> = {};
      for (const ticket of ticketsData) {
        if (ticket.convertedTaskId) {
          nextTicketByTaskId[ticket.convertedTaskId] = ticket.id;
        }
      }
      setTicketByTaskId(nextTicketByTaskId);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tasks.loadError'));
    }
  }, [projectId, request, setError, t]);

  useEffect(() => {
    if (!project) return;
    void loadTasks();
  }, [loadTasks, project]);

  useEffect(() => {
    function syncHighlightFromHash() {
      if (!window.location.hash.startsWith('#task-')) return;
      const taskId = decodeURIComponent(window.location.hash.replace('#task-', ''));
      if (!taskId) return;
      setHighlightedTaskId(taskId);
      window.setTimeout(() => {
        setHighlightedTaskId((prev) => (prev === taskId ? null : prev));
      }, 2200);
    }

    syncHighlightFromHash();
    window.addEventListener('hashchange', syncHighlightFromHash);
    return () => window.removeEventListener('hashchange', syncHighlightFromHash);
  }, []);

  const tasksByStatus = useMemo(() => {
    const map = new Map<Status, TaskItem[]>();
    for (const s of STATUSES) map.set(s, []);
    for (const task of tasks) {
      const list = map.get(task.status as Status);
      if (list) list.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return map;
  }, [tasks]);

  function findTaskStatus(taskId: string): Status | null {
    for (const [status, items] of tasksByStatus) {
      if (items.some((t) => t.id === taskId)) return status;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeStatus = findTaskStatus(active.id as string);
    let overStatus: Status | null = null;
    if (STATUSES.includes(over.id as Status)) {
      overStatus = over.id as Status;
    } else {
      overStatus = findTaskStatus(over.id as string);
    }

    if (!activeStatus || !overStatus || activeStatus === overStatus) return;

    setTasks((prev) => {
      const task = prev.find((t) => t.id === active.id);
      if (!task) return prev;
      return prev.map((t) =>
        t.id === active.id ? { ...t, status: overStatus as string } : t,
      );
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    let targetStatus: Status | null = null;
    if (STATUSES.includes(over.id as Status)) {
      targetStatus = over.id as Status;
    } else {
      targetStatus = findTaskStatus(over.id as string);
    }
    if (!targetStatus) return;

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === active.id ? { ...t, status: targetStatus as string } : t,
      );

      const columnItems = updated
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      const overIndex = columnItems.findIndex((t) => t.id === over.id);
      const activeIndex = columnItems.findIndex((t) => t.id === active.id);

      if (overIndex >= 0 && activeIndex >= 0 && overIndex !== activeIndex) {
        const moved = columnItems.splice(activeIndex, 1)[0];
        if (!moved) return prev;
        columnItems.splice(overIndex, 0, moved);
      }

      const positionMap = new Map<string, number>();
      columnItems.forEach((t, i) => positionMap.set(t.id, i));

      return updated.map((t) => {
        const newPos = positionMap.get(t.id);
        return newPos !== undefined ? { ...t, position: newPos } : t;
      });
    });

    if (!pendingReorder.current) {
      pendingReorder.current = true;
      setTimeout(() => {
        void persistReorder();
        pendingReorder.current = false;
      }, 100);
    }
  }

  async function persistReorder() {
    const items = tasks.map((t) => ({
      id: t.id,
      status: t.status,
      position: t.position ?? 0,
    }));

    try {
      await request('/tasks/reorder', {
        method: 'PATCH',
        body: { projectId, items },
      });
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.tasks.reorderError'));
      await loadTasks();
    }
  }

  function handleTaskClick(task: TaskItem) {
    setSelectedTask(task);
    setSheetOpen(true);
  }

  function handleAddTask(status: string) {
    setCreateDefaultStatus(status);
    setCreateOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await request(`/tasks/${deleteTarget}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(getErrorMessage(e, t, 'project.task.deleteError'));
    }
  }

  if (!project) return null;

  return (
    <>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t('project.task.deleteTitle')}
        description={t('project.task.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onConfirm={() => void handleConfirmDelete()}
      />

      {isAdmin ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => { setCreateDefaultStatus(undefined); setCreateOpen(true); }}>
            {t('project.task.create')}
          </Button>
        </div>
      ) : null}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => void loadTasks()}
        defaultStatus={createDefaultStatus}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((status) => {
            const columnTasks = tasksByStatus.get(status) ?? [];
            return (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columnTasks}
                isAdmin={isAdmin}
                ticketByTaskId={ticketByTaskId}
                projectId={projectId}
                locale={locale}
                highlightedTaskId={highlightedTaskId}
                onTaskClick={handleTaskClick}
                onTaskDelete={isAdmin ? (id) => setDeleteTarget(id) : undefined}
                onAddTask={isAdmin ? handleAddTask : undefined}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        linkedTicketId={selectedTask ? ticketByTaskId[selectedTask.id] : undefined}
        onTaskUpdated={() => void loadTasks()}
      />
    </>
  );
}
