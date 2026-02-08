'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslations } from '@/components/providers/translation-provider';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  OctagonAlert,
  Zap,
} from 'lucide-react';

interface ProjectOverviewProps {
  locale: string;
  projectId: string;
  dashboard: {
    project: {
      id: string;
      name: string;
      status: string;
      progress: number;
      description?: string | null;
      nextAction?: string | null;
      estimatedDeliveryAt?: string | null;
      createdAt?: string;
    };
    summary: {
      totalTasks: number;
      doneTasks: number;
      blockedTasks: number;
      completionRate: number;
    };
  };
}

export function ProjectOverview({ locale, projectId, dashboard }: ProjectOverviewProps) {
  const { t } = useTranslations();
  const { project, summary } = dashboard;

  return (
    <div className="space-y-6">
      {/* Project vitals */}
      <Card className="overflow-hidden rounded-2xl">
        <CardContent className="space-y-6 p-6">
          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('project.progress')}</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {summary.doneTasks}/{summary.totalTasks} {t('project.overview.tasksDone')}
            </p>
          </div>

          {/* Next action callout */}
          {project.nextAction ? (
            <div className="rounded-xl bg-accent/[0.07] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15">
                  <Zap className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-accent">{t('project.nextAction')}</p>
                  <p className="mt-1 text-sm text-foreground">{project.nextAction}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Dates row */}
          {(project.estimatedDeliveryAt || project.createdAt) ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
              {project.estimatedDeliveryAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('project.overview.estimatedDelivery')}:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(project.estimatedDeliveryAt).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              ) : null}
              {project.createdAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('project.overview.createdAt')}:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(project.createdAt).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Task metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={`/${locale}/projects/${projectId}/tasks`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="border-0 bg-primary/5 rounded-2xl shadow-none transition-all duration-200 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{t('project.section.tasks')}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{summary.totalTasks}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href={`/${locale}/projects/${projectId}/tasks`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="border-0 bg-emerald-500/5 rounded-2xl shadow-none transition-all duration-200 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{t('project.tasks.done')}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                  {summary.doneTasks}<span className="text-base font-normal text-muted-foreground">/{summary.totalTasks}</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href={`/${locale}/projects/${projectId}/tasks`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className={`border-0 rounded-2xl shadow-none transition-all duration-200 hover:shadow-md ${summary.blockedTasks > 0 ? 'bg-destructive/5' : 'bg-muted/50'}`}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${summary.blockedTasks > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <OctagonAlert className={`h-5 w-5 ${summary.blockedTasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{t('project.tasks.blocked')}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{summary.blockedTasks}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
