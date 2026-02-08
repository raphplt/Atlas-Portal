'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { MilestoneItem, TaskDetail, TaskItem } from '@/lib/portal/types';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Link2,
} from 'lucide-react';
import { TaskAttachments } from './task-attachments';
import { TaskChecklist } from './task-checklist';

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const STATUS_DOT: Record<string, string> = {
  BACKLOG: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  BLOCKED_BY_CLIENT: 'bg-orange-500',
  DONE: 'bg-emerald-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
  URGENT: 'bg-red-200 text-red-900',
};

interface TaskDetailSheetProps {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedTicketId?: string;
  onTaskUpdated: () => void;
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  linkedTicketId,
  onTaskUpdated,
}: TaskDetailSheetProps) {
  const { t } = useTranslations();
  const { request, projectId, isAdmin, locale } = useProjectContext();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit state for admin
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Milestone validation
  const [milestoneComment, setMilestoneComment] = useState('');

  const loadDetail = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const data = await request<TaskDetail>(`/tasks/${task.id}`);
      setDetail(data);
      setEditTitle(data.title);
      setEditDescription(data.description ?? '');
      setEditStatus(data.status);
      setEditPriority(data.priority ?? '');
      setEditDueDate(data.dueDate ? data.dueDate.split('T')[0] ?? '' : '');
      setDirty(false);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [task, request]);

  useEffect(() => {
    if (open && task) {
      void loadDetail();
    }
  }, [open, task, loadDetail]);

  function markDirty() {
    setDirty(true);
  }

  async function saveChanges() {
    if (!detail || !dirty) return;
    setSaving(true);
    try {
      await request(`/tasks/${detail.id}`, {
        method: 'PATCH',
        body: {
          title: editTitle,
          description: editDescription || undefined,
          status: editStatus,
          priority: editPriority || null,
          dueDate: editDueDate || null,
        },
      });
      setDirty(false);
      onTaskUpdated();
      void loadDetail();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function validateMilestone(validated: boolean) {
    if (!detail?.milestoneType) return;
    try {
      await request(`/projects/${projectId}/milestones/validate`, {
        method: 'POST',
        body: {
          type: detail.milestoneType,
          validated,
          comment: milestoneComment || undefined,
        },
      });
      setMilestoneComment('');
      onTaskUpdated();
      void loadDetail();
    } catch {
      // silently fail
    }
  }

  const isMilestone = !!detail?.milestoneType;
  const mv = detail?.milestoneValidation;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg gap-0 p-0">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">{t('project.task.detail')}</SheetTitle>
        </SheetHeader>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-12 px-6">
            <p className="text-sm text-muted-foreground">{t('project.loading')}</p>
          </div>
        ) : (
          <div className="space-y-5 overflow-y-auto px-6 pt-6 pb-8">
            {/* Title */}
            {isAdmin ? (
              <Input
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); markDirty(); }}
                className="text-lg font-semibold border-0 px-0 shadow-none focus-visible:ring-0 h-auto"
              />
            ) : (
              <h2 className="text-lg font-semibold text-foreground">
                {isMilestone ? t(`status.milestone.${detail.milestoneType}`) : detail.title}
              </h2>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[detail.status] ?? 'bg-slate-400'}`} />
                {isAdmin ? (
                  <select
                    value={editStatus}
                    onChange={(e) => { setEditStatus(e.target.value); markDirty(); }}
                    className="text-xs font-medium border-0 bg-transparent p-0 cursor-pointer focus:outline-none"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{t(`status.task.${s}`)}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-medium">{t(`status.task.${detail.status}`)}</span>
                )}
              </div>

              {isMilestone ? (
                <Badge className="bg-accent/15 text-accent text-[10px] gap-1">
                  <Flag className="h-2.5 w-2.5" />
                  {t(`status.milestone.${detail.milestoneType}`)}
                </Badge>
              ) : (
                <Badge className="text-[10px]">
                  {t(`status.taskSource.${detail.source}`)}
                </Badge>
              )}

              {detail.priority || isAdmin ? (
                isAdmin ? (
                  <select
                    value={editPriority}
                    onChange={(e) => { setEditPriority(e.target.value); markDirty(); }}
                    className={`text-[10px] font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${
                      PRIORITY_COLORS[editPriority] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <option value="">{t('project.task.priority')}</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{t(`status.taskPriority.${p}`)}</option>
                    ))}
                  </select>
                ) : detail.priority ? (
                  <Badge className={`text-[10px] ${PRIORITY_COLORS[detail.priority] ?? ''}`}>
                    {t(`status.taskPriority.${detail.priority}`)}
                  </Badge>
                ) : null
              ) : null}
            </div>

            {/* Due date */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {isAdmin ? (
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => { setEditDueDate(e.target.value); markDirty(); }}
                    className="text-sm bg-transparent border-0 p-0 text-foreground focus:outline-none"
                  />
                ) : detail.dueDate ? (
                  <span className="text-foreground">
                    {new Date(detail.dueDate).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t('project.task.dueDate')}</span>
                )}
              </div>
              {detail.createdAt ? (
                <span className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {new Date(detail.createdAt).toLocaleDateString(locale)}
                </span>
              ) : null}
            </div>

            {/* Save button */}
            {isAdmin && dirty ? (
              <Button size="sm" onClick={() => void saveChanges()} disabled={saving}>
                {saving ? t('project.loading') : t('project.task.save')}
              </Button>
            ) : null}

            <Separator />

            {/* Milestone validation section */}
            {isMilestone && mv ? (
              <>
                <MilestoneValidationSection
                  milestone={mv}
                  isAdmin={isAdmin}
                  locale={locale}
                  comment={milestoneComment}
                  onCommentChange={setMilestoneComment}
                  onValidate={(v) => void validateMilestone(v)}
                />
                <Separator />
              </>
            ) : null}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('project.form.description')}</Label>
              {isAdmin ? (
                <Textarea
                  value={editDescription}
                  onChange={(e) => { setEditDescription(e.target.value); markDirty(); }}
                  className="text-sm min-h-20"
                  rows={3}
                />
              ) : detail.description ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{detail.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">-</p>
              )}
            </div>

            {detail.blockedReason ? (
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-sm text-orange-700">{detail.blockedReason}</p>
              </div>
            ) : null}

            <Separator />

            {/* Checklist */}
            <TaskChecklist taskId={detail.id} isAdmin={isAdmin} />

            <Separator />

            {/* Attachments */}
            <TaskAttachments
              taskId={detail.id}
              isAdmin={isAdmin}
              files={detail.files}
              onFilesChange={() => void loadDetail()}
            />

            {/* Linked ticket */}
            {linkedTicketId ? (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/${locale}/projects/${projectId}/tickets/${linkedTicketId}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('project.task.openTicket')}
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MilestoneValidationSection({
  milestone,
  isAdmin,
  locale,
  comment,
  onCommentChange,
  onValidate,
}: {
  milestone: MilestoneItem;
  isAdmin: boolean;
  locale: string;
  comment: string;
  onCommentChange: (v: string) => void;
  onValidate: (validated: boolean) => void;
}) {
  const { t } = useTranslations();

  const adminValidated = !!milestone.validatedByAdminAt;
  const clientValidated = !!milestone.validatedByClientAt;
  const fullyValidated = milestone.validated;
  const myValidated = isAdmin ? adminValidated : clientValidated;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Flag className="h-4 w-4 text-accent" />
        {t('project.task.milestoneValidation')}
      </h4>

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
          {milestone.validatedByAdminAt ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(milestone.validatedByAdminAt).toLocaleDateString(locale)}
            </span>
          ) : null}
        </div>
        {milestone.adminComment ? (
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
          {milestone.validatedByClientAt ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(milestone.validatedByClientAt).toLocaleDateString(locale)}
            </span>
          ) : null}
        </div>
        {milestone.clientComment ? (
          <p className="ml-6 text-xs text-muted-foreground italic">{milestone.clientComment}</p>
        ) : null}
      </div>

      {fullyValidated ? (
        <p className="text-xs text-emerald-600 font-medium">{t('milestone.fullyValidated')}</p>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder={t('project.form.message')}
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            className="text-sm"
            rows={2}
          />
          <Button
            type="button"
            size="sm"
            variant={myValidated ? 'destructive' : 'secondary'}
            onClick={() => onValidate(!myValidated)}
          >
            {myValidated ? t('project.milestone.unvalidate') : t('project.milestone.validate')}
          </Button>
        </div>
      )}
    </div>
  );
}
