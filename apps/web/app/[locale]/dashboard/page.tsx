'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Bug,
  HelpCircle,
  Wrench,
  Sparkles,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type MetricConfig = { icon: typeof FolderKanban; cardBg: string; iconBg: string; iconColor: string };

const DEFAULT_METRIC: MetricConfig = {
  icon: FolderKanban,
  cardBg: 'bg-primary/5',
  iconBg: 'bg-primary/10',
  iconColor: 'text-primary',
};

const METRIC_CONFIGS: MetricConfig[] = [
  { icon: FolderKanban, cardBg: 'bg-primary/5', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  { icon: Clock, cardBg: 'bg-accent/5', iconBg: 'bg-accent/10', iconColor: 'text-accent' },
  { icon: Ticket, cardBg: 'bg-blue-500/5', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
  { icon: CheckCircle2, cardBg: 'bg-emerald-500/5', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600' },
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
            <Gauge className="h-6 w-6 text-primary" />
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
            <Card key={i} className="border-0 bg-muted/30 rounded-2xl shadow-none">
              <CardHeader className="p-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-10 w-16" />
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
              <Card key={metric.label} className={`border-0 ${config.cardBg} rounded-2xl shadow-none transition-all duration-200 hover:shadow-md`}>
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between">
                    <CardDescription className="text-sm font-medium">{metric.label}</CardDescription>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.iconBg}`}>
                      <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>
                  </div>
                  <CardTitle className="mt-2 text-4xl font-bold tabular-nums tracking-tight">{metric.value}</CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Content sections */}
      {loading ? (
        <div className="grid gap-10 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="mb-5 space-y-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-10 xl:grid-cols-2">
          {/* Recent projects */}
          <div>
            <div className="mb-5">
              <h3 className="text-base font-semibold text-foreground">{t('dashboard.section.projects')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.section.projectsDescription')}</p>
            </div>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <FolderKanban className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.empty')}</p>
                </div>
              ) : null}
              {projects.slice(0, 8).map((project) => {
                const badgeClass = PROJECT_STATUS_BADGE[project.status] ?? '';
                const statusAccent = project.status === 'WAITING_CLIENT' ? 'bg-accent' : project.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-primary';
                return (
                  <Link
                    key={project.id}
                    className="group relative block overflow-hidden rounded-xl border border-border/40 bg-card p-4 pl-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/${locale}/projects/${project.id}/overview`}
                    aria-label={`${t('project.open')}: ${project.name}`}
                  >
                    <div className={`absolute inset-y-0 left-0 w-1 ${statusAccent}`} />

                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">{project.name}</p>
                      <Badge className={badgeClass}>{t(`status.project.${project.status}`)}</Badge>
                    </div>

                    <div className="mb-3 flex items-center gap-3">
                      <Progress value={project.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">{project.progress}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{project.nextAction ?? t('project.nextActionFallback')}</p>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent tickets */}
          <div>
            <div className="mb-5">
              <h3 className="text-base font-semibold text-foreground">{t('dashboard.section.tickets')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.section.ticketsDescription')}</p>
            </div>
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
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
                    className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/${locale}/projects/${ticket.projectId}/tickets`}
                    aria-label={`${t('dashboard.openTicketModule')}: ${ticket.title}`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                      <TypeIcon className={`h-4 w-4 ${typeColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{ticket.title}</p>
                        <Badge className={`shrink-0 ${statusBadgeClass}`}>{t(`status.ticket.${ticket.status}`)}</Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{t(`status.ticketType.${ticket.type}`)}</span>
                        <span className="text-border">·</span>
                        <span>
                          {new Date(ticket.createdAt).toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
