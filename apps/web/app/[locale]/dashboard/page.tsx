'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSummary, TicketItem } from '@/lib/portal/types';
import {
  FolderKanban,
  Clock,
  Ticket,
  CheckCircle2,
  Plus,
  UserPlus,
  ArrowRight,
  LayoutDashboard
} from 'lucide-react';

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

    return {
      totalProjects,
      waitingProjects,
      openTickets,
      doneProjects,
    };
  }, [projects, tickets]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            {isAdmin ? t('dashboard.admin.title') : t('dashboard.client.title')}
          </h1>
          <p>{isAdmin ? t('dashboard.admin.subtitle') : t('dashboard.client.subtitle')}</p>
        </div>

        {isAdmin ? (
          <div className="flex gap-2">
            <Link className="btn-primary" href={`/${locale}/projects/new`}>
              <Plus className="h-5 w-5" />
              {t('dashboard.cta.newProject')}
            </Link>
            <Link className="btn-secondary" href={`/${locale}/clients/invite`}>
              <UserPlus className="h-5 w-5" />
              {t('dashboard.cta.inviteClient')}
            </Link>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('project.loading')}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>{t('dashboard.metric.projects')}</CardDescription>
              <div className="icon-wrapper">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
            <CardTitle className="text-3xl">{metrics.totalProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>{t('dashboard.metric.waiting')}</CardDescription>
              <div className="icon-wrapper">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <CardTitle className="text-3xl">{metrics.waitingProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>{t('dashboard.metric.tickets')}</CardDescription>
              <div className="icon-wrapper">
                <Ticket className="h-5 w-5" />
              </div>
            </div>
            <CardTitle className="text-3xl">{metrics.openTickets}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>{t('dashboard.metric.completed')}</CardDescription>
              <div className="icon-wrapper">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <CardTitle className="text-3xl">{metrics.doneProjects}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.section.projects')}</CardTitle>
            <CardDescription>{t('dashboard.section.projectsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 ? <p>{t('dashboard.empty')}</p> : null}
            {projects.slice(0, 8).map((project) => (
              <div key={project.id} className="rounded-(--radius) border border-border p-3 hover:bg-background-alt transition-colors">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium text-(--color-foreground)">{project.name}</p>
                  <Badge>{t(`status.project.${project.status}`)}</Badge>
                </div>
                <p className="text-xs text-muted">{project.nextAction ?? t('project.nextActionFallback')}</p>
                <Link className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline" href={`/${locale}/projects/${project.id}/overview`}>
                  {t('project.open')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.section.tickets')}</CardTitle>
            <CardDescription>{t('dashboard.section.ticketsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.length === 0 ? <p>{t('tickets.empty')}</p> : null}
            {tickets.slice(0, 8).map((ticket) => (
              <div key={ticket.id} className="rounded-(--radius) border border-border p-3 hover:bg-background-alt transition-colors">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium text-(--color-foreground)">{ticket.title}</p>
                  <Badge>{t(`status.ticket.${ticket.status}`)}</Badge>
                </div>
                <p className="text-xs text-muted">{t(`status.ticketType.${ticket.type}`)}</p>
                <Link className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline" href={`/${locale}/projects/${ticket.projectId}/tickets`}>
                  {t('dashboard.openTicketModule')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
