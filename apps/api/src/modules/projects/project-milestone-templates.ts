import { MilestoneType, ProjectMilestoneTemplate } from '../../common/enums';

const MILESTONE_ORDER: MilestoneType[] = [
  MilestoneType.DESIGN,
  MilestoneType.CONTENT,
  MilestoneType.DELIVERY,
];

const TEMPLATE_MILESTONES: Record<ProjectMilestoneTemplate, MilestoneType[]> = {
  [ProjectMilestoneTemplate.STANDARD]: [
    MilestoneType.DESIGN,
    MilestoneType.CONTENT,
    MilestoneType.DELIVERY,
  ],
  [ProjectMilestoneTemplate.QUICK_START]: [
    MilestoneType.DESIGN,
    MilestoneType.DELIVERY,
  ],
  [ProjectMilestoneTemplate.CONTENT_FIRST]: [
    MilestoneType.CONTENT,
    MilestoneType.DELIVERY,
  ],
  [ProjectMilestoneTemplate.CUSTOM]: [...MILESTONE_ORDER],
};

export interface ResolvedProjectMilestones {
  template: ProjectMilestoneTemplate;
  milestoneTypes: MilestoneType[];
}

export function getTemplateMilestones(
  template: ProjectMilestoneTemplate,
): MilestoneType[] {
  return [...(TEMPLATE_MILESTONES[template] ?? TEMPLATE_MILESTONES.STANDARD)];
}

export function normalizeMilestoneTypes(
  types: MilestoneType[],
): MilestoneType[] {
  const wanted = new Set(types);
  return MILESTONE_ORDER.filter((type) => wanted.has(type));
}

export function resolveProjectMilestones(input: {
  template?: ProjectMilestoneTemplate;
  milestoneTypes?: MilestoneType[];
}): ResolvedProjectMilestones {
  const template = input.template ?? ProjectMilestoneTemplate.STANDARD;

  if (input.milestoneTypes && input.milestoneTypes.length > 0) {
    const normalized = normalizeMilestoneTypes(input.milestoneTypes);
    const templateDefaults = getTemplateMilestones(template);
    const templateMatchesSelection =
      normalized.length === templateDefaults.length &&
      normalized.every((type, index) => type === templateDefaults[index]);

    return {
      template: templateMatchesSelection
        ? template
        : ProjectMilestoneTemplate.CUSTOM,
      milestoneTypes: normalized,
    };
  }

  const templateMilestones = getTemplateMilestones(template);
  return {
    template,
    milestoneTypes: templateMilestones,
  };
}
