import {
  MilestoneTypeKey,
  ProjectMilestoneTemplate,
} from './types';

export const MILESTONE_TYPE_ORDER: MilestoneTypeKey[] = [
  'DESIGN',
  'CONTENT',
  'DELIVERY',
];

export const DEFAULT_PROJECT_MILESTONE_TEMPLATE: ProjectMilestoneTemplate =
  'STANDARD';

export const MILESTONE_TEMPLATE_PRESETS: Record<
  ProjectMilestoneTemplate,
  MilestoneTypeKey[]
> = {
  STANDARD: ['DESIGN', 'CONTENT', 'DELIVERY'],
  QUICK_START: ['DESIGN', 'DELIVERY'],
  CONTENT_FIRST: ['CONTENT', 'DELIVERY'],
  CUSTOM: [...MILESTONE_TYPE_ORDER],
};

export function normalizeMilestones(
  milestoneTypes: MilestoneTypeKey[],
): MilestoneTypeKey[] {
  const selected = new Set(milestoneTypes);
  return MILESTONE_TYPE_ORDER.filter((item) => selected.has(item));
}
