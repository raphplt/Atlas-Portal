export interface UserSessionInfo {
  id: string;
  workspaceId: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface WorkspaceSessionInfo {
  id: string;
  name: string;
  slug: string;
}

export interface SessionState {
  user: UserSessionInfo;
  workspace?: WorkspaceSessionInfo;
}
