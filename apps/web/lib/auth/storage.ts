import { SessionState } from './types';

const STORAGE_KEY = 'atlas.portal.session.v1';

export function readStoredSession(): SessionState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
