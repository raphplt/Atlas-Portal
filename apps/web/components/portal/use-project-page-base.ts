'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ProjectPayload } from '@/lib/portal/types';

interface Options {
  adminOnly?: boolean;
}

export function useProjectPageBase(locale: string, projectId: string, options?: Options) {
  const { session, ready, request } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user.role === 'ADMIN';

  const loadProject = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const payload = await request<ProjectPayload>(`/projects/${projectId}`);
      setProject(payload);
      setError(null);
    } catch {
      setError('PROJECT_LOAD_FAILED');
    }
  }, [projectId, request, session]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }

    if (options?.adminOnly && session.user.role !== 'ADMIN') {
      router.push(`/${locale}/projects/${projectId}/overview`);
      return;
    }

    void (async () => {
      setLoading(true);
      await loadProject();
      setLoading(false);
    })();
  }, [loadProject, locale, options?.adminOnly, projectId, ready, router, session]);

  return {
    project,
    setProject,
    loading,
    setLoading,
    error,
    setError,
    session,
    ready,
    request,
    router,
    isAdmin,
    loadProject,
  };
}
