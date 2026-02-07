'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { ProjectPayload } from '@/lib/portal/types';

interface ProjectContextValue {
  project: ProjectPayload | null;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  isAdmin: boolean;
  request: <T>(path: string, options?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }) => Promise<T>;
  refreshProject: () => Promise<void>;
  locale: string;
  projectId: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return context;
}

interface ProjectProviderProps {
  locale: string;
  projectId: string;
  children: ReactNode;
}

export function ProjectProvider({ locale, projectId, children }: ProjectProviderProps) {
  const { session, ready, request } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user.role === 'ADMIN';

  const loadProject = useCallback(async () => {
    if (!session) return;
    try {
      const payload = await request<ProjectPayload>(`/projects/${projectId}`);
      setProject(payload);
      setError(null);
    } catch {
      setError(t('project.error'));
    }
  }, [projectId, request, session, t]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }
    void (async () => {
      setLoading(true);
      await loadProject();
      setLoading(false);
    })();
  }, [loadProject, locale, ready, router, session]);

  const value = useMemo<ProjectContextValue>(() => ({
    project,
    loading,
    error,
    setError,
    isAdmin,
    request,
    refreshProject: loadProject,
    locale,
    projectId,
  }), [project, loading, error, isAdmin, request, loadProject, locale, projectId]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
