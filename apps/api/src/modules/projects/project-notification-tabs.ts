export const PROJECT_NOTIFICATION_TABS = [
  'tasks',
  'tickets',
  'messages',
  'files',
  'payments',
  'milestones',
  'activity',
  'admin-notes',
] as const;

export type ProjectNotificationTab = (typeof PROJECT_NOTIFICATION_TABS)[number];

export function isProjectNotificationTab(value: string): value is ProjectNotificationTab {
  return PROJECT_NOTIFICATION_TABS.includes(value as ProjectNotificationTab);
}
