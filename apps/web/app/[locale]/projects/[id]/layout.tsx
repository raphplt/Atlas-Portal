'use client';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EditProjectDialog } from '@/components/portal/dialogs/edit-project-dialog';
import { ProjectProvider, useProjectContext } from '@/components/portal/project-context';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectSocket } from '@/hooks/use-project-socket';
import {
  MessageItem,
  ProjectTabNotificationCounts,
  ProjectTabNotificationsPayload,
} from '@/lib/portal/types';
import {
  LayoutDashboard,
  ListTodo,
  Ticket,
  MessageSquare,
  FolderOpen,
  CreditCard,
  Activity,
  Lock,
  Mail,
  Link as LinkIcon,
  Building2,
  Pencil,
} from 'lucide-react';

interface TabDef {
  key: ProjectTabKey;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

type ProjectTabKey =
  | 'overview'
  | 'tasks'
  | 'tickets'
  | 'messages'
  | 'files'
  | 'payments'
  | 'activity'
  | 'admin-notes';

const PROJECT_STATUS_BADGE: Record<string, string> = {
  IN_PROGRESS: 'bg-primary/10 text-primary',
  WAITING_CLIENT: 'bg-accent/10 text-accent',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

const TABS: TabDef[] = [
  { key: 'overview', labelKey: 'project.nav.overview', icon: LayoutDashboard },
  { key: 'tasks', labelKey: 'project.nav.tasks', icon: ListTodo },
  { key: 'tickets', labelKey: 'project.nav.tickets', icon: Ticket },
  { key: 'messages', labelKey: 'project.nav.messages', icon: MessageSquare },
  { key: 'files', labelKey: 'project.nav.files', icon: FolderOpen },
  { key: 'payments', labelKey: 'project.nav.payments', icon: CreditCard },
  { key: 'activity', labelKey: 'project.nav.activity', icon: Activity },
  { key: 'admin-notes', labelKey: 'project.nav.adminNotes', icon: Lock, adminOnly: true },
];

const EMPTY_TAB_NOTIFICATIONS: ProjectTabNotificationCounts = {
  tasks: 0,
  tickets: 0,
  messages: 0,
  files: 0,
  payments: 0,
  activity: 0,
  'admin-notes': 0,
};

type NotificationTabKey = Exclude<ProjectTabKey, 'overview'>;
const NOTIFICATION_TAB_KEYS: NotificationTabKey[] = [
  'tasks',
  'tickets',
  'messages',
  'files',
  'payments',
  'activity',
  'admin-notes',
];

function isNotificationTabKey(value: string): value is NotificationTabKey {
  return NOTIFICATION_TAB_KEYS.includes(value as NotificationTabKey);
}

function formatBadgeCount(count: number) {
  return count > 99 ? '99+' : String(count);
}

function ProjectLayoutInner({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const { project, loading, error, isAdmin, locale, projectId, request } = useProjectContext();
  const { session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const previousTabRef = useRef<string | null>(null);
  const [tabNotifications, setTabNotifications] = useState<ProjectTabNotificationCounts>(EMPTY_TAB_NOTIFICATIONS);
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const activeTab = useMemo(() => {
    const base = `/${locale}/projects/${projectId}/`;
    if (!pathname?.startsWith(base)) return 'overview';
    const remainder = pathname.slice(base.length).split('/')[0];
    return remainder || 'overview';
  }, [pathname, locale, projectId]);

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => !tab.adminOnly || isAdmin),
    [isAdmin],
  );

  const loadTabNotifications = useCallback(async () => {
    if (!project) return;

    try {
      const payload = await request<ProjectTabNotificationsPayload>(
        `/projects/${projectId}/tab-notifications`,
      );
      setTabNotifications({
        ...EMPTY_TAB_NOTIFICATIONS,
        ...payload.counts,
      });
    } catch {
      // Non-blocking UI enhancement; keep page functional if it fails.
    }
  }, [project, projectId, request]);

  const markTabAsRead = useCallback(async (tab: NotificationTabKey) => {
    setTabNotifications((previous) => {
      if (previous[tab] === 0) return previous;
      return {
        ...previous,
        [tab]: 0,
      };
    });

    try {
      await request(`/projects/${projectId}/tab-notifications/${tab}/read`, {
        method: 'POST',
      });
    } catch {
      void loadTabNotifications();
    }
  }, [loadTabNotifications, projectId, request]);

  useEffect(() => {
    if (!project) return;
    void loadTabNotifications();
  }, [loadTabNotifications, project]);

  useEffect(() => {
    if (!project) return;

    const previousTab = previousTabRef.current;
    if (
      previousTab &&
      previousTab !== activeTab &&
      isNotificationTabKey(previousTab)
    ) {
      void markTabAsRead(previousTab);
    }

    if (isNotificationTabKey(activeTab)) {
      void markTabAsRead(activeTab);
    }

    previousTabRef.current = activeTab;
  }, [activeTab, markTabAsRead, project]);

  useProjectSocket({
    projectId,
    enabled: !!project,
    onNewMessage: useCallback((message: MessageItem) => {
      if (message.authorId === session?.user.id) return;

      if (activeTab === 'messages') {
        void markTabAsRead('messages');
        return;
      }

      setTabNotifications((previous) => ({
        ...previous,
        messages: previous.messages + 1,
      }));
    }, [activeTab, markTabAsRead, session?.user.id]),
  });

  if (loading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (error && !project) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!project) {
    return <p>{t('project.error')}</p>;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Link
          href={`/${locale}/projects`}
          className="text-sm text-muted-foreground hover:underline"
        >
          {t('project.backToProjects')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.description ?? t('projects.noDescription')}
            </p>
            {project.clientEmail || project.clientWebsite || project.clientCompany ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {project.clientCompany ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {project.clientCompany}
                  </span>
                ) : null}
                {project.clientEmail ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {project.clientEmail}
                  </span>
                ) : null}
                {project.clientWebsite ? (
                  <a
                    href={project.clientWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    {project.clientWebsite}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={PROJECT_STATUS_BADGE[project.status] ?? ''}>{t(`status.project.${project.status}`)}</Badge>
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditProjectOpen(true)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('project.edit.cta')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          router.push(`/${locale}/projects/${projectId}/${value}`);
        }}
      >
        <TabsList variant="line" className="w-full flex-wrap justify-start">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const unreadCount = isNotificationTabKey(tab.key)
              ? tabNotifications[tab.key]
              : 0;
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 cursor-pointer">
                <Icon className="h-4 w-4" />
                <span>{t(tab.labelKey)}</span>
                {unreadCount > 0 ? (
                  <span
                    className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none tabular-nums text-primary-foreground ring-1 ring-background/80"
                    aria-label={t('project.nav.unreadCount', { count: unreadCount })}
                  >
                    {formatBadgeCount(unreadCount)}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {children}

      {isAdmin ? (
        <EditProjectDialog open={editProjectOpen} onOpenChange={setEditProjectOpen} />
      ) : null}
    </section>
  );
}

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ locale: string; id: string }>();

  return (
    <ProjectProvider locale={params.locale} projectId={params.id}>
      <ProjectLayoutInner>{children}</ProjectLayoutInner>
    </ProjectProvider>
  );
}
