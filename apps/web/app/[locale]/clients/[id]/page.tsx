'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ClientDetailPayload,
  ClientInvitationSummary,
  ProjectSummary,
} from '@/lib/portal/types';
import {
  getClientDisplayName,
  getInitials,
  getInvitationBadgeVariant,
} from '@/lib/portal/client-utils';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderKanban,
  Globe2,
  Hourglass,
  Mail,
  UserPlus,
} from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-center justify-between py-5">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-md bg-secondary p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDetailsPage() {
  const { session, ready, request } = useAuth();
  const params = useParams<{ locale: string; id: string }>();
  const locale = params.locale;
  const clientId = params.id;
  const router = useRouter();
  const { t } = useTranslations();

  const [client, setClient] = useState<ClientDetailPayload | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [invitations, setInvitations] = useState<ClientInvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<
    string | null
  >(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [clientData, projectData] = await Promise.all([
        request<ClientDetailPayload>(`/users/clients/${clientId}`),
        request<ProjectSummary[]>(`/projects?limit=100&clientId=${clientId}`),
      ]);

      const invitationData = await request<ClientInvitationSummary[]>(
        `/invitations?limit=100&search=${encodeURIComponent(clientData.email)}`,
      );

      const normalizedEmail = clientData.email.toLowerCase();
      const relatedInvitations = invitationData
        .filter((invitation) => invitation.email.toLowerCase() === normalizedEmail)
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        );

      const sortedProjects = [...projectData].sort(
        (left, right) =>
          new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
          new Date(left.updatedAt ?? left.createdAt ?? 0).getTime(),
      );

      setClient(clientData);
      setProjects(sortedProjects);
      setInvitations(relatedInvitations);
    } catch {
      setClient(null);
      setProjects([]);
      setInvitations([]);
      setError(t('clients.detail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [clientId, request, t]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }

    if (session.user.role !== 'ADMIN') {
      router.push(`/${locale}/dashboard`);
      return;
    }

    void loadData();
  }, [loadData, locale, ready, router, session]);

  async function handleRevokeInvitation(invitationId: string) {
    setRevokingInvitationId(invitationId);
    setError(null);

    try {
      await request(`/invitations/${invitationId}/revoke`, { method: 'POST' });
      await loadData();
    } catch {
      setError(t('clients.revokeError'));
    } finally {
      setRevokingInvitationId(null);
    }
  }

  const metricCards = useMemo(() => {
    if (!client) {
      return [];
    }

    return [
      {
        label: t('clients.detail.metric.totalProjects'),
        value: client.stats.totalProjects,
        icon: FolderKanban,
      },
      {
        label: t('clients.detail.metric.activeProjects'),
        value: client.stats.activeProjects,
        icon: Hourglass,
      },
      {
        label: t('clients.detail.metric.completedProjects'),
        value: client.stats.completedProjects,
        icon: CheckCircle2,
      },
      {
        label: t('clients.detail.metric.averageProgress'),
        value: `${client.stats.averageProgress}%`,
        icon: Clock3,
      },
    ] satisfies MetricCardProps[];
  }, [client, t]);

  if (loading) {
    return <p>{t('project.loading')}</p>;
  }

  if (!client) {
    return (
      <section className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Link
          href={`/${locale}/clients`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('clients.back')}
        </Link>
        <p>{t('clients.detail.notFound')}</p>
      </section>
    );
  }

  const displayName = getClientDisplayName(client);

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <Link
          href={`/${locale}/clients`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('clients.back')}
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
              {getInitials(displayName)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{displayName}</h1>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/${locale}/clients/invite`}>
                <UserPlus className="h-4 w-4" />
                {t('clients.cta.invite')}
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/${locale}/projects/new?clientId=${client.id}`}>
                <FolderKanban className="h-4 w-4" />
                {t('clients.detail.createProject')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{t('clients.detail.identityTitle')}</CardTitle>
            <CardDescription>{t('clients.detail.identityDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 bg-muted/20">
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <p className="mb-2 text-xs text-muted-foreground">{t('clients.detail.email')}</p>
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Mail className="h-4 w-4 text-primary" />
                {client.email}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <p className="mb-2 text-xs text-muted-foreground">{t('clients.detail.locale')}</p>
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Globe2 className="h-4 w-4 text-primary" />
                {client.locale?.toUpperCase() ?? '-'}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <p className="mb-2 text-xs text-muted-foreground">{t('clients.detail.joinedAt')}</p>
              <p className="flex items-center gap-2 font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                {client.createdAt
                  ? new Date(client.createdAt).toLocaleString(locale)
                  : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <p className="mb-2 text-xs text-muted-foreground">{t('clients.detail.lastProjectUpdate')}</p>
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                {client.stats.lastProjectUpdateAt
                  ? new Date(client.stats.lastProjectUpdateAt).toLocaleString(
                      locale,
                    )
                  : t('common.notAvailable')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{t('clients.detail.invitationStatsTitle')}</CardTitle>
            <CardDescription>{t('clients.detail.invitationStatsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 bg-muted/20">
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{t('status.invitation.PENDING')}</p>
                <Badge variant="default">{client.invitationStats.pendingInvitations}</Badge>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{t('status.invitation.ACCEPTED')}</p>
                <Badge variant="secondary">{client.invitationStats.acceptedInvitations}</Badge>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{t('status.invitation.REVOKED')}</p>
                <Badge variant="destructive">{client.invitationStats.revokedInvitations}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{t('status.invitation.EXPIRED')}</p>
                <Badge variant="outline">{client.invitationStats.expiredInvitations}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <p className="mb-2 text-xs text-muted-foreground">{t('clients.detail.latestInvitation')}</p>
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                {client.invitationStats.latestInvitationAt
                  ? new Date(client.invitationStats.latestInvitationAt).toLocaleString(
                      locale,
                    )
                  : t('common.notAvailable')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('clients.detail.projectsTitle')}</CardTitle>
          <CardDescription>{t('clients.detail.projectsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 bg-muted/20">
          {projects.length === 0 ? <p>{t('clients.detail.projectsEmpty')}</p> : null}
          {projects.map((project) => (
            <Link
              key={project.id}
              className="group block rounded-xl border border-border/80 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${locale}/projects/${project.id}/overview`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="line-clamp-1 font-medium text-foreground">{project.name}</p>
                <Badge>{t(`status.project.${project.status}`)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('project.progress')}: {project.progress}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('project.nextAction')}: {project.nextAction ?? t('project.nextActionFallback')}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {t('project.open')}
                <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('clients.detail.invitationsTitle')}</CardTitle>
          <CardDescription>{t('clients.detail.invitationsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 bg-muted/20">
          {invitations.length === 0 ? <p>{t('clients.detail.invitationsEmpty')}</p> : null}
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="rounded-xl border border-border/80 bg-card p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="truncate font-medium text-foreground">{invitation.email}</p>
                <Badge variant={getInvitationBadgeVariant(invitation.status)}>
                  {t(`status.invitation.${invitation.status}`)}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t('clients.detail.invitationSentAt')}:{' '}
                  {new Date(invitation.createdAt).toLocaleString(locale)}
                </p>
                <p>
                  {t('clients.invitationExpires')}:{' '}
                  {new Date(invitation.expiresAt).toLocaleString(locale)}
                </p>
                {invitation.acceptedAt ? (
                  <p>
                    {t('clients.detail.invitationAcceptedAt')}:{' '}
                    {new Date(invitation.acceptedAt).toLocaleString(locale)}
                  </p>
                ) : null}
                {invitation.revokedAt ? (
                  <p>
                    {t('clients.detail.invitationRevokedAt')}:{' '}
                    {new Date(invitation.revokedAt).toLocaleString(locale)}
                  </p>
                ) : null}
              </div>
              {invitation.status === 'PENDING' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void handleRevokeInvitation(invitation.id)}
                  disabled={revokingInvitationId === invitation.id}
                >
                  {t('clients.revoke')}
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
