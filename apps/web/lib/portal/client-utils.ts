import { ClientSummary } from './types';

export function getInvitationBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACCEPTED':
      return 'secondary';
    case 'REVOKED':
      return 'destructive';
    case 'EXPIRED':
      return 'outline';
    default:
      return 'default';
  }
}

export function getClientDisplayName(
  client: Pick<ClientSummary, 'email' | 'firstName' | 'lastName'>,
): string {
  const fullName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || client.email;
}

export function getInitials(value: string): string {
  const chunks = value
    .replace('@', ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? '').join('') || 'C';
}
