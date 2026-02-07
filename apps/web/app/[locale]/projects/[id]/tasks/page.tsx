'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPageShell } from '@/components/portal/project-page-shell';
import { useProjectPageBase } from '@/components/portal/use-project-page-base';
import { useTranslations } from '@/components/providers/translation-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskItem } from '@/lib/portal/types';

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;

export default function ProjectTasksPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const { t } = useTranslations();

  const {
    project,
    loading,
    error,
    setError,
    isAdmin,
    request,
  } = useProjectPageBase(locale, id);

  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const loadTasks = useCallback(async () => {
    try {
      const data = await request<TaskItem[]>(`/tasks?projectId=${id}&limit=100`);
      setTasks(data);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [id, request, setError]);

  useEffect(() => {
    if (!project) {
      return;
    }
    void loadTasks();
  }, [loadTasks, project]);

  const tasksByStatus = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    STATUSES.forEach((status) => map.set(status, []));

    tasks.forEach((task) => {
      const existing = map.get(task.status) ?? [];
      existing.push(task);
      map.set(task.status, existing);
    });

    return map;
  }, [tasks]);

  async function updateTaskStatus(taskId: string, status: string) {
    try {
      await request(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status },
      });
      await loadTasks();
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
      activeTab="tasks"
      headerAction={
        isAdmin ? (
          <Link className="btn-primary" href={`/${locale}/projects/${id}/tasks/new`}>
            {t('project.task.create')}
          </Link>
        ) : null
      }
    >
      {error ? <p className="text-sm text-red-600">{t('project.error')}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {STATUSES.map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle>{t(`status.task.${status}`)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(tasksByStatus.get(status) ?? []).length === 0 ? <p className="text-sm text-[var(--color-muted)]">{t('tasks.emptyStatus')}</p> : null}
              {(tasksByStatus.get(status) ?? []).map((task) => (
                <div key={task.id} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                  <p className="font-medium text-[var(--color-foreground)]">{task.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">{t(`status.taskSource.${task.source}`)}</p>
                  {task.description ? <p className="mt-2 text-sm text-[var(--color-muted)]">{task.description}</p> : null}

                  {isAdmin ? (
                    <select
                      className="input-base mt-2"
                      value={task.status}
                      onChange={(event) => void updateTaskStatus(task.id, event.target.value)}
                    >
                      {STATUSES.map((next) => (
                        <option key={next} value={next}>
                          {t(`status.task.${next}`)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </ProjectPageShell>
  );
}
