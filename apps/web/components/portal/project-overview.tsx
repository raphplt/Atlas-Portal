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
      <Card>
        <CardContent className="space-y-5 p-5">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{t('project.progress')}</span>
              <span className="font-semibold tabular-nums text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              {summary.doneTasks}/{summary.totalTasks} {t('project.overview.tasksDone')}
            </p>
          </div>

          {/* Next action callout */}
          {project.nextAction ? (
            <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">{t('project.nextAction')}</p>
                <p className="mt-0.5 text-sm text-foreground">{project.nextAction}</p>
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
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="border-l-4 border-l-primary transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t('project.section.tasks')}</p>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{summary.totalTasks}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href={`/${locale}/projects/${projectId}/tasks`}
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="border-l-4 border-l-emerald-500 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t('project.tasks.done')}</p>
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {summary.doneTasks}<span className="text-base font-normal text-muted-foreground">/{summary.totalTasks}</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href={`/${locale}/projects/${projectId}/tasks`}
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className={`border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${summary.blockedTasks > 0 ? 'border-l-destructive' : 'border-l-muted-foreground/30'}`}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${summary.blockedTasks > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <OctagonAlert className={`h-5 w-5 ${summary.blockedTasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t('project.tasks.blocked')}</p>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{summary.blockedTasks}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
