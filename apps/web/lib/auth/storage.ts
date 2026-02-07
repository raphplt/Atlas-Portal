import { SessionState } from './types';

const STORAGE_KEY = 'atlas.portal.session.v2';

function isValidSession(session: unknown): session is SessionState {
  if (!session || typeof session !== 'object') {
    return false;
  }

  const candidate = session as Partial<SessionState>;
  const user = candidate.user as Partial<SessionState['user']> | undefined;

  if (!user || typeof user !== 'object') {
    return false;
  }

  return (
    typeof user.id === 'string' &&
    typeof user.workspaceId === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'ADMIN' || user.role === 'CLIENT') &&
    typeof user.locale === 'string'
  );
}

export function readStoredSession(): SessionState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSession(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: SessionState | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  if (!isValidSession(session)) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
