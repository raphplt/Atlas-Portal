'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/api-error';
import { MilestoneItem } from '@/lib/portal/types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const TYPES = ['DESIGN', 'CONTENT', 'DELIVERY'] as const;

function MilestoneStatus({ milestone }: { milestone: MilestoneItem | undefined }) {
  const { t } = useTranslations();

  if (!milestone) return <Badge>{t('common.pending')}</Badge>;

  if (milestone.validated) {
    return <Badge className="bg-emerald-100 text-emerald-800">{t('milestone.fullyValidated')}</Badge>;
  }
  if (milestone.validatedByAdminAt && !milestone.validatedByClientAt) {
    return <Badge className="bg-yellow-100 text-yellow-800">{t('milestone.pendingClient')}</Badge>;
  }
  if (!milestone.validatedByAdminAt && milestone.validatedByClientAt) {
    return <Badge className="bg-yellow-100 text-yellow-800">{t('milestone.pendingAdmin')}</Badge>;
  }
  return <Badge>{t('common.pending')}</Badge>;
}

export default function ProjectMilestonesPage() {
  const { locale, projectId, project, error, setError, isAdmin, request } = useProjectContext();
  const { t } = useTranslations();

  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});

  const loadMilestones = useCallback(async () => {
    try {
      const data = await request<MilestoneItem[]>(`/projects/${projectId}/milestones`);
      setMilestones(data);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.milestone.loadError'));
    }
  }, [projectId, request, setError, t]);

  useEffect(() => {
    if (!project) return;
    void loadMilestones();
  }, [loadMilestones, project]);

  async function validate(type: string, validated: boolean) {
    try {
      await request(`/projects/${projectId}/milestones/validate`, {
        method: 'POST',
        body: { type, validated, comment: comments[type] || undefined },
      });
      setComments((prev) => ({ ...prev, [type]: '' }));
      await loadMilestones();
    } catch (e) {
      setError(getErrorMessage(e, t, 'project.milestone.validationError'));
    }
  }

  if (!project) return null;

  return (
    <>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TYPES.map((type) => {
          const milestone = milestones.find((item) => item.type === type);
          const adminValidated = !!milestone?.validatedByAdminAt;
          const clientValidated = !!milestone?.validatedByClientAt;
          const fullyValidated = milestone?.validated ?? false;

          // Can this user toggle their own validation?
          const myValidated = isAdmin ? adminValidated : clientValidated;

          return (
            <div key={type} className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{t(`status.milestone.${type}`)}</p>
                <MilestoneStatus milestone={milestone} />
              </div>

              {/* Validation steps */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {adminValidated ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={adminValidated ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('milestone.validatedByAdmin')}
                  </span>
                  {milestone?.validatedByAdminAt ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(milestone.validatedByAdminAt).toLocaleDateString(locale)}
                    </span>
                  ) : null}
                </div>
                {milestone?.adminComment ? (
                  <p className="ml-6 text-xs text-muted-foreground italic">{milestone.adminComment}</p>
                ) : null}

                <div className="flex items-center gap-2 text-sm">
                  {clientValidated ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={clientValidated ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('milestone.validatedByClient')}
                  </span>
                  {milestone?.validatedByClientAt ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(milestone.validatedByClientAt).toLocaleDateString(locale)}
                    </span>
                  ) : null}
                </div>
                {milestone?.clientComment ? (
                  <p className="ml-6 text-xs text-muted-foreground italic">{milestone.clientComment}</p>
                ) : null}
              </div>

              {/* Action for current user */}
              {!fullyValidated ? (
                <div className="space-y-2 pt-1">
                  <Textarea
                    placeholder={t('project.form.message')}
                    value={comments[type] ?? ''}
                    onChange={(e) => setComments((prev) => ({ ...prev, [type]: e.target.value }))}
                    className="text-sm"
                    rows={2}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={myValidated ? 'destructive' : 'secondary'}
                    onClick={() => void validate(type, !myValidated)}
                  >
                    {myValidated ? t('project.milestone.unvalidate') : t('project.milestone.validate')}
                  </Button>
                </div>
              ) : (
                <p className="pt-1 text-xs text-emerald-600 font-medium">
                  {t('milestone.fullyValidated')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
