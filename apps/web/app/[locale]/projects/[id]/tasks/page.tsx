'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreateTaskDialog } from '@/components/portal/dialogs/create-task-dialog';
import {
	DndContext,
	DragEndEvent,
	DragOverEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	closestCorners,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/lib/api-error';
import { TaskItem } from '@/lib/portal/types';
import { GripVertical } from "lucide-react";

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<string, string> = {
	BACKLOG: "border-t-slate-400",
	IN_PROGRESS: "border-t-blue-500",
	BLOCKED_BY_CLIENT: "border-t-orange-500",
	DONE: "border-t-emerald-500",
};

function TaskCard({ task, isAdmin }: { task: TaskItem; isAdmin: boolean }) {
	const { t } = useTranslations();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id, disabled: !isAdmin });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="rounded-md border border-border bg-background p-3 shadow-sm"
		>
			<div className="flex items-start gap-2">
				{isAdmin ? (
					<button
						type="button"
						className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
						{...attributes}
						{...listeners}
					>
						<GripVertical className="h-4 w-4" />
					</button>
				) : null}
				<div className="flex-1 min-w-0">
					<p className="font-medium text-foreground text-sm">
						{task.title}
					</p>
					<div className="flex items-center gap-2 mt-1">
						<Badge className="text-[10px]">
							{t(`status.taskSource.${task.source}`)}
						</Badge>
					</div>
					{task.description ? (
						<p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
					) : null}
					{task.blockedReason ? (
						<p className="mt-1 text-xs text-orange-600">{task.blockedReason}</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

function TaskCardOverlay({ task }: { task: TaskItem }) {
	const { t } = useTranslations();
	return (
		<div className="rounded-md border border-border bg-background p-3 shadow-lg rotate-2">
			<p className="font-medium text-foreground text-sm">{task.title}</p>
			<Badge className="mt-1 text-[10px]">
				{t(`status.taskSource.${task.source}`)}
			</Badge>
		</div>
	);
}

export default function ProjectTasksPage() {
	const { projectId, project, error, setError, isAdmin, request } =
		useProjectContext();
	const { t } = useTranslations();

	const [tasks, setTasks] = useState<TaskItem[]>([]);
	const [createOpen, setCreateOpen] = useState(false);
	const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
	const pendingReorder = useRef(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	const loadTasks = useCallback(async () => {
		try {
			const data = await request<TaskItem[]>(`/tasks?projectId=${projectId}&limit=100`);
			setTasks(data);
			setError(null);
		} catch (e) {
			setError(getErrorMessage(e, t, "project.tasks.loadError"));
		}
	}, [projectId, request, setError, t]);

	useEffect(() => {
		if (!project) return;
		void loadTasks();
	}, [loadTasks, project]);

	const tasksByStatus = useMemo(() => {
		const map = new Map<Status, TaskItem[]>();
		for (const s of STATUSES) map.set(s, []);
		for (const task of tasks) {
			const list = map.get(task.status as Status);
			if (list) list.push(task);
		}
		// Sort by position within each column
		for (const list of map.values()) {
			list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
		}
		return map;
	}, [tasks]);

	function findTaskStatus(taskId: string): Status | null {
		for (const [status, items] of tasksByStatus) {
			if (items.some((t) => t.id === taskId)) return status;
		}
		return null;
	}

	function handleDragStart(event: DragStartEvent) {
		const task = tasks.find((t) => t.id === event.active.id);
		setActiveTask(task ?? null);
	}

	function handleDragOver(event: DragOverEvent) {
		const { active, over } = event;
		if (!over) return;

		const activeStatus = findTaskStatus(active.id as string);
		// Check if over is a column or a task
		let overStatus: Status | null = null;
		if (STATUSES.includes(over.id as Status)) {
			overStatus = over.id as Status;
		} else {
			overStatus = findTaskStatus(over.id as string);
		}

		if (!activeStatus || !overStatus || activeStatus === overStatus) return;

		// Move task to new column (optimistic)
		setTasks((prev) => {
			const task = prev.find((t) => t.id === active.id);
			if (!task) return prev;
			return prev.map((t) =>
				t.id === active.id ? { ...t, status: overStatus as string } : t,
			);
		});
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveTask(null);
		const { active, over } = event;
		if (!over) return;

		// Determine final status
		let targetStatus: Status | null = null;
		if (STATUSES.includes(over.id as Status)) {
			targetStatus = over.id as Status;
		} else {
			targetStatus = findTaskStatus(over.id as string);
		}
		if (!targetStatus) return;

		// Calculate new order: build the column list and move active to over's position
		setTasks((prev) => {
			const updated = prev.map((t) =>
				t.id === active.id ? { ...t, status: targetStatus as string } : t,
			);

			// Get items in the target column
			const columnItems = updated
				.filter((t) => t.status === targetStatus)
				.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

			// If over is a task, insert before/after it
			const overIndex = columnItems.findIndex((t) => t.id === over.id);
			const activeIndex = columnItems.findIndex((t) => t.id === active.id);

			if (overIndex >= 0 && activeIndex >= 0 && overIndex !== activeIndex) {
				// Remove active and insert at overIndex
				const moved = columnItems.splice(activeIndex, 1)[0];
				if (!moved) return prev;
				columnItems.splice(overIndex, 0, moved);
			}

			// Assign positions
			const positionMap = new Map<string, number>();
			columnItems.forEach((t, i) => positionMap.set(t.id, i));

			const result = updated.map((t) => {
				const newPos = positionMap.get(t.id);
				return newPos !== undefined ? { ...t, position: newPos } : t;
			});

			return result;
		});

		// Persist to backend
		if (!pendingReorder.current) {
			pendingReorder.current = true;
			// Use setTimeout to batch the state update
			setTimeout(() => {
				void persistReorder();
				pendingReorder.current = false;
			}, 100);
		}
	}

	async function persistReorder() {
		// Build the items array from current state
		const items = tasks.map((t) => ({
			id: t.id,
			status: t.status,
			position: t.position ?? 0,
		}));

		try {
			await request("/tasks/reorder", {
				method: "PATCH",
				body: { projectId: projectId, items },
			});
		} catch (e) {
			setError(getErrorMessage(e, t, "project.tasks.reorderError"));
			await loadTasks();
		}
	}

	if (!project) return null;

	return (
		<>
			{isAdmin ? (
				<div className="mb-4 flex justify-end">
					<Button onClick={() => setCreateOpen(true)}>
						{t("project.task.create")}
					</Button>
				</div>
			) : null}

			<CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => void loadTasks()} />

			{error ? <p className="text-sm text-red-600">{error}</p> : null}

			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{STATUSES.map((status) => {
						const columnTasks = tasksByStatus.get(status) ?? [];
						return (
							<KanbanColumn
								key={status}
								status={status}
								tasks={columnTasks}
								isAdmin={isAdmin}
							/>
						);
					})}
				</div>

				<DragOverlay>
					{activeTask ? <TaskCardOverlay task={activeTask} /> : null}
				</DragOverlay>
			</DndContext>
		</>
	);
}

function KanbanColumn({
	status,
	tasks,
	isAdmin,
}: {
	status: Status;
	tasks: TaskItem[];
	isAdmin: boolean;
}) {
	const { t } = useTranslations();
	const { setNodeRef } = useSortable({
		id: status,
		data: { type: "column" },
		disabled: true,
	});

	return (
		<Card className={`border-t-2 ${STATUS_COLORS[status] ?? ""}`}>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center justify-between text-sm">
					{t(`status.task.${status}`)}
					<span className="text-xs text-muted-foreground font-normal">{tasks.length}</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 min-h-20">
				<div ref={setNodeRef} className="space-y-2">
					<SortableContext
						items={tasks.map((t) => t.id)}
						strategy={verticalListSortingStrategy}
					>
						{tasks.length === 0 ? (
							<p className="text-xs text-muted-foreground py-4 text-center">
								{t("tasks.emptyStatus")}
							</p>
						) : null}
						{tasks.map((task) => (
							<TaskCard key={task.id} task={task} isAdmin={isAdmin} />
						))}
					</SortableContext>
				</div>
			</CardContent>
		</Card>
	);
}
