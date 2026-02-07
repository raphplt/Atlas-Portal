'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSummary, TicketItem } from '@/lib/portal/types';
import {
  FolderKanban,
  Clock,
  Ticket,
  CheckCircle2,
  Plus,
  UserPlus,
  ArrowRight,
  LayoutDashboard,
  Bug,
  HelpCircle,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type MetricConfig = { icon: typeof FolderKanban; bg: string; iconColor: string; accent: string };

const DEFAULT_METRIC: MetricConfig = {
  icon: FolderKanban,
  bg: 'bg-primary/10',
  iconColor: 'text-primary',
  accent: 'border-l-primary',
};

const METRIC_CONFIGS: MetricConfig[] = [
  { icon: FolderKanban, bg: 'bg-primary/10', iconColor: 'text-primary', accent: 'border-l-primary' },
  { icon: Clock, bg: 'bg-accent/10', iconColor: 'text-accent', accent: 'border-l-accent' },
  { icon: Ticket, bg: 'bg-primary/10', iconColor: 'text-primary', accent: 'border-l-primary/60' },
  { icon: CheckCircle2, bg: 'bg-primary/10', iconColor: 'text-primary', accent: 'border-l-primary/40' },
];

const PROJECT_STATUS_BADGE: Record<string, string> = {
  IN_PROGRESS: 'bg-primary/10 text-primary',
  WAITING_CLIENT: 'bg-accent/10 text-accent',
  COMPLETED: 'bg-muted text-muted-foreground',
};

const TICKET_STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-primary/10 text-primary',
  NEEDS_INFO: 'bg-accent/10 text-accent',
  ACCEPTED: 'bg-primary/10 text-primary',
  REJECTED: 'bg-destructive/10 text-destructive',
  PAYMENT_REQUIRED: 'bg-accent/10 text-accent',
  PAID: 'bg-primary/10 text-primary',
  CONVERTED: 'bg-muted text-muted-foreground',
};

const TICKET_TYPE_ICON: Record<string, typeof Bug> = {
  BUG: Bug,
  QUESTION: HelpCircle,
  MODIFICATION: Wrench,
  IMPROVEMENT: Sparkles,
};

const TICKET_TYPE_COLOR: Record<string, string> = {
  BUG: 'text-destructive',
  QUESTION: 'text-primary',
  MODIFICATION: 'text-accent',
  IMPROVEMENT: 'text-primary',
};

export default function DashboardPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const router = useRouter();
  const { t } = useTranslations();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user.role === 'ADMIN';

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [projectsData, ticketsData] = await Promise.all([
        request<ProjectSummary[]>('/projects?limit=30'),
        request<TicketItem[]>('/tickets?limit=30'),
      ]);
      setProjects(projectsData);
      setTickets(ticketsData);
    } catch {
      setError(t('dashboard.error'));
    } finally {
      setLoading(false);
    }
  }, [request, t]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }

    void loadData();
  }, [loadData, locale, ready, router, session]);

  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const waitingProjects = projects.filter((project) => project.status === 'WAITING_CLIENT').length;
    const openTickets = tickets.filter((ticket) => ['OPEN', 'NEEDS_INFO', 'PAYMENT_REQUIRED'].includes(ticket.status)).length;
    const doneProjects = projects.filter((project) => project.status === 'COMPLETED').length;

    return [
      { label: t('dashboard.metric.projects'), value: totalProjects },
      { label: t('dashboard.metric.waiting'), value: waitingProjects },
      { label: t('dashboard.metric.tickets'), value: openTickets },
      { label: t('dashboard.metric.completed'), value: doneProjects },
    ];
  }, [projects, tickets, t]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            {isAdmin ? t('dashboard.admin.title') : t('dashboard.client.title')}
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">{isAdmin ? t('dashboard.admin.subtitle') : t('dashboard.client.subtitle')}</p>
        </div>

        {isAdmin ? (
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/${locale}/projects/new`}>
                <Plus className="h-5 w-5" />
                {t('dashboard.cta.newProject')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${locale}/clients/invite`}>
                <UserPlus className="h-5 w-5" />
                {t('dashboard.cta.inviteClient')}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {/* Metric cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, i) => {
            const config = METRIC_CONFIGS[i] ?? DEFAULT_METRIC;
            const Icon = config.icon;
            return (
              <Card key={metric.label} className={`border-l-4 ${config.accent} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardDescription>{metric.label}</CardDescription>
                    <div className={`flex items-center justify-center size-10 rounded-full ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>
                  </div>
                  <CardTitle className="text-3xl tabular-nums">{metric.value}</CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Content sections */}
      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {/* Recent projects */}
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{t('dashboard.section.projects')}</CardTitle>
              <CardDescription>{t('dashboard.section.projectsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 bg-muted/20">
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <FolderKanban className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.empty')}</p>
                </div>
              ) : null}
              {projects.slice(0, 8).map((project) => {
                const badgeClass = PROJECT_STATUS_BADGE[project.status] ?? '';
                return (
                  <Link
                    key={project.id}
                    className="group block rounded-xl border border-border/80 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/${locale}/projects/${project.id}/overview`}
                    aria-label={`${t('project.open')}: ${project.name}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 font-medium text-foreground">{project.name}</p>
                      <Badge className={badgeClass}>{t(`status.project.${project.status}`)}</Badge>
                    </div>

                    <div className="mb-2 flex items-center gap-3">
                      <Progress value={project.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">{project.progress}%</span>
                    </div>

                    <p className="text-xs text-muted-foreground">{project.nextAction ?? t('project.nextActionFallback')}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      {t('project.open')}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent tickets */}
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{t('dashboard.section.tickets')}</CardTitle>
              <CardDescription>{t('dashboard.section.ticketsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 bg-muted/20">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Ticket className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('tickets.empty')}</p>
                </div>
              ) : null}
              {tickets.slice(0, 8).map((ticket) => {
                const statusBadgeClass = TICKET_STATUS_BADGE[ticket.status] ?? '';
                const TypeIcon = TICKET_TYPE_ICON[ticket.type] ?? HelpCircle;
                const typeColor = TICKET_TYPE_COLOR[ticket.type] ?? 'text-muted-foreground';

                return (
                  <Link
                    key={ticket.id}
                    className="group block rounded-xl border border-border/80 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/${locale}/projects/${ticket.projectId}/tickets`}
                    aria-label={`${t('dashboard.openTicketModule')}: ${ticket.title}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60">
                          <TypeIcon className={`h-3.5 w-3.5 ${typeColor}`} />
                        </div>
                        <p className="line-clamp-1 font-medium text-foreground">{ticket.title}</p>
                      </div>
                      <Badge className={statusBadgeClass}>{t(`status.ticket.${ticket.status}`)}</Badge>
                    </div>
                    <div className="flex items-center justify-between pl-9">
                      <p className="text-xs text-muted-foreground">{t(`status.ticketType.${ticket.type}`)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1 pl-9 text-sm font-medium text-primary">
                      {t('dashboard.openTicketModule')}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
