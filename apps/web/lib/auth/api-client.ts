import { SessionState } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  session: SessionState | null;
  updateSession: (session: SessionState | null) => void;
}

async function doFetch(path: string, options: RequestOptions, accessToken: string) {
  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions): Promise<T> {
  if (!options.session) {
    throw new Error('Not authenticated');
  }

  let response = await doFetch(path, options, options.session.accessToken);

  if (response.status === 401 && options.session.refreshToken) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: options.session.refreshToken }),
    });

    if (refreshResponse.ok) {
      const refreshPayload = (await refreshResponse.json()) as {
        accessToken: string;
        refreshToken: string;
        user: SessionState['user'];
      };

      const updatedSession: SessionState = {
        ...options.session,
        accessToken: refreshPayload.accessToken,
        refreshToken: refreshPayload.refreshToken,
        user: refreshPayload.user,
      };

      options.updateSession(updatedSession);
      response = await doFetch(path, options, updatedSession.accessToken);
    } else {
      options.updateSession(null);
      throw new Error('Authentication expired');
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function anonymousRequest<T>(path: string, method: 'POST' | 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
