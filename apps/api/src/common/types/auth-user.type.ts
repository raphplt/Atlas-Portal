import { UserRole } from '../enums';

export interface AuthUser {
  id: string;
  workspaceId: string;
  role: UserRole;
  email: string;
}
