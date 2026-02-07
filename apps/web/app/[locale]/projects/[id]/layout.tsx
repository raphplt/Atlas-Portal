'use client';

import { ReactNode, useMemo } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProjectProvider, useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard,
  ListTodo,
  Ticket,
  MessageSquare,
  FolderOpen,
  CreditCard,
  Flag,
  Activity,
  Lock,
} from 'lucide-react';

interface TabDef {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

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
  { key: 'milestones', labelKey: 'project.nav.milestones', icon: Flag },
  { key: 'activity', labelKey: 'project.nav.activity', icon: Activity },
  { key: 'admin-notes', labelKey: 'project.nav.adminNotes', icon: Lock, adminOnly: true },
];

function ProjectLayoutInner({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const { project, loading, error, isAdmin, locale, projectId } = useProjectContext();
  const pathname = usePathname();
  const router = useRouter();

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
          </div>
          <Badge className={PROJECT_STATUS_BADGE[project.status] ?? ''}>{t(`status.project.${project.status}`)}</Badge>
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
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 cursor-pointer">
                <Icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {children}
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
