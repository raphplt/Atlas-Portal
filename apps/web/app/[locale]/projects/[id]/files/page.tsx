'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UploadFileDialog } from '@/components/portal/dialogs/upload-file-dialog';
import { useProjectContext } from '@/components/portal/project-context';
import { useAuth } from '@/components/providers/auth-provider';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getErrorMessage } from '@/lib/api-error';
import { FileItem, FileNoteItem } from '@/lib/portal/types';
import { Check, Download, Eye, File, FileImage, FileText, MessageSquare, Send, Trash2, Upload, X } from "lucide-react";

function isPreviewable(contentType: string): boolean {
	return contentType.startsWith("image/") || contentType === "application/pdf";
}

function isImage(contentType: string): boolean {
	return contentType.startsWith("image/");
}

const CATEGORIES = ["BRANDING", "CONTENT", "DELIVERABLE", "OTHER"] as const;

const CATEGORY_ICONS: Record<string, typeof File> = {
	BRANDING: FileImage,
	CONTENT: FileText,
	DELIVERABLE: File,
	OTHER: File,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
	BRANDING: { bg: "bg-primary/10", text: "text-primary" },
	CONTENT: { bg: "bg-blue-500/10", text: "text-blue-600" },
	DELIVERABLE: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
	OTHER: { bg: "bg-accent/10", text: "text-accent" },
};

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((w) => w[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export default function ProjectFilesPage() {
	const { locale, projectId, project, error, setError, isAdmin, request } =
		useProjectContext();
	const { session } = useAuth();
	const { t } = useTranslations();

	const [files, setFiles] = useState<FileItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploadOpen, setUploadOpen] = useState(false);
	const [categoryFilter, setCategoryFilter] = useState<string>("");
	const [preview, setPreview] = useState<{ url: string; name: string; contentType: string } | null>(null);
	const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
	const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());

	// Selection
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Delete confirmation (supports single + multi)
	const [deleteTargets, setDeleteTargets] = useState<FileItem[]>([]);
	const [deleting, setDeleting] = useState(false);

	// Notes
	const [notesFile, setNotesFile] = useState<FileItem | null>(null);

	const selectionMode = selectedIds.size > 0;

	function toggleSelect(fileId: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(fileId)) next.delete(fileId);
			else next.add(fileId);
			return next;
		});
	}

	function selectAllVisible() {
		setSelectedIds(new Set(files.map((f) => f.id)));
	}

	function clearSelection() {
		setSelectedIds(new Set());
	}

	function requestDeleteSelected() {
		const targets = files.filter((f) => selectedIds.has(f.id));
		if (targets.length > 0) setDeleteTargets(targets);
	}

	const loadFiles = useCallback(async () => {
		try {
			setLoading(true);
			const qs = new URLSearchParams({ projectId: projectId, limit: "100" });
			if (categoryFilter) qs.set("category", categoryFilter);
			const data = await request<FileItem[]>(`/files?${qs.toString()}`);
			setFiles(data);
			setThumbnailUrls(new Map());
			setSelectedIds(new Set());
			setError(null);
		} catch (e) {
			setError(getErrorMessage(e, t, "project.file.loadError"));
		} finally {
			setLoading(false);
		}
	}, [projectId, request, setError, categoryFilter, t]);

	useEffect(() => {
		if (!project) return;
		void loadFiles();
	}, [loadFiles, project]);

	// Lazy-load thumbnail URLs for image files
	useEffect(() => {
		const imageFiles = files.filter(
			(f) => isImage(f.contentType) && f.isUploaded && !thumbnailUrls.has(f.id) && !loadingUrls.has(f.id)
		);
		if (imageFiles.length === 0) return;

		setLoadingUrls((prev) => {
			const next = new Set(prev);
			for (const f of imageFiles) next.add(f.id);
			return next;
		});

		for (const file of imageFiles) {
			void (async () => {
				try {
					const payload = await request<{ downloadUrl: string }>(`/files/${file.id}/download-url`);
					setThumbnailUrls((prev) => new Map(prev).set(file.id, payload.downloadUrl));
				} catch {
					// Silently fail — card will show icon fallback
				} finally {
					setLoadingUrls((prev) => {
						const next = new Set(prev);
						next.delete(file.id);
						return next;
					});
				}
			})();
		}
	}, [files, thumbnailUrls, loadingUrls, request]);

	async function downloadFile(fileId: string) {
		try {
			const payload = await request<{ downloadUrl: string }>(
				`/files/${fileId}/download-url`,
			);
			window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
		} catch (e) {
			setError(getErrorMessage(e, t, "project.file.downloadError"));
		}
	}

	async function confirmDelete() {
		if (deleteTargets.length === 0) return;
		setDeleting(true);
		try {
			for (const file of deleteTargets) {
				await request(`/files/${file.id}`, { method: "DELETE" });
			}
			setDeleteTargets([]);
			setSelectedIds(new Set());
			await loadFiles();
		} catch (e) {
			setError(getErrorMessage(e, t, "project.file.deleteError"));
		} finally {
			setDeleting(false);
		}
	}

	async function previewFile(file: FileItem) {
		if (!isPreviewable(file.contentType)) return;
		try {
			const payload = await request<{ downloadUrl: string }>(
				`/files/${file.id}/download-url`,
			);
			setPreview({ url: payload.downloadUrl, name: file.originalName, contentType: file.contentType });
		} catch (e) {
			setError(getErrorMessage(e, t, "project.file.downloadError"));
		}
	}

	const filesByCategory = useMemo(() => {
		const map = new Map<string, FileItem[]>();
		for (const cat of CATEGORIES) map.set(cat, []);
		for (const file of files) {
			const list = map.get(file.category) ?? map.get("OTHER")!;
			list.push(file);
		}
		return map;
	}, [files]);

	if (!project) return null;

	const showGrouped = !categoryFilter;
	const currentUserId = session?.user.id ?? "";
	const isMultiDelete = deleteTargets.length > 1;

	return (
		<TooltipProvider>
			{/* Header: upload + selection bar */}
			<div className="mb-4 flex items-center justify-between gap-3">
				<div className="flex-1">
					{isAdmin && selectionMode ? (
						<div className="flex items-center gap-3">
							<span className="text-sm font-medium text-foreground">
								{t("project.file.selected").replace("{count}", String(selectedIds.size))}
							</span>
							<Button size="sm" variant="outline" onClick={selectAllVisible}>
								{t("project.file.selectAll")}
							</Button>
							<Button size="sm" variant="ghost" onClick={clearSelection}>
								{t("project.file.clearSelection")}
							</Button>
							<Button size="sm" variant="destructive" onClick={requestDeleteSelected}>
								<Trash2 className="mr-1.5 h-3.5 w-3.5" />
								{t("project.file.delete")}
							</Button>
						</div>
					) : null}
				</div>
				<Button onClick={() => setUploadOpen(true)}>
					<Upload className="mr-2 h-4 w-4" />
					{t("project.file.upload")}
				</Button>
			</div>

			<UploadFileDialog open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={() => void loadFiles()} />

			{error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

			<div className="mb-6 flex flex-wrap gap-1">
				<button
					type="button"
					className={`rounded-md px-3 py-1.5 text-sm transition-colors ${!categoryFilter ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
					onClick={() => setCategoryFilter("")}
				>
					{t("tickets.filterAllTypes")}
				</button>
				{CATEGORIES.map((cat) => (
					<button
						key={cat}
						type="button"
						className={`rounded-md px-3 py-1.5 text-sm transition-colors ${categoryFilter === cat ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
						onClick={() => setCategoryFilter(cat)}
					>
						{t(`status.file.${cat}`)}
					</button>
				))}
			</div>

			{loading ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="overflow-hidden rounded-xl border border-border/40">
							<Skeleton className="h-36 w-full rounded-none" />
							<div className="space-y-2 p-3">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</div>
					))}
				</div>
			) : files.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
					<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
						<File className="h-6 w-6 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">{t("files.empty")}</p>
				</div>
			) : showGrouped ? (
				<div className="space-y-8">
					{CATEGORIES.map((cat) => {
						const catFiles = filesByCategory.get(cat) ?? [];
						if (catFiles.length === 0) return null;
						const Icon = CATEGORY_ICONS[cat] ?? File;
						const colors = CATEGORY_COLORS[cat]!;
						return (
							<div key={cat}>
								<div className="mb-4 flex items-center gap-3">
									<div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.bg}`}>
										<Icon className={`h-4 w-4 ${colors.text}`} />
									</div>
									<h3 className="text-sm font-semibold text-foreground">
										{t(`status.file.${cat}`)}
									</h3>
									<span className="text-xs font-normal text-muted-foreground">
										({catFiles.length})
									</span>
								</div>
								<FileGrid
									files={catFiles}
									locale={locale}
									isAdmin={isAdmin}
									selectedIds={selectedIds}
									selectionMode={selectionMode}
									thumbnailUrls={thumbnailUrls}
									loadingUrls={loadingUrls}
									onDownload={downloadFile}
									onDelete={(f) => setDeleteTargets([f])}
									onPreview={previewFile}
									onNotes={setNotesFile}
									onToggleSelect={toggleSelect}
									t={t}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<FileGrid
					files={files}
					locale={locale}
					isAdmin={isAdmin}
					selectedIds={selectedIds}
					selectionMode={selectionMode}
					thumbnailUrls={thumbnailUrls}
					loadingUrls={loadingUrls}
					onDownload={downloadFile}
					onDelete={(f) => setDeleteTargets([f])}
					onPreview={previewFile}
					onNotes={setNotesFile}
					onToggleSelect={toggleSelect}
					t={t}
				/>
			)}

			{/* Preview dialog */}
			<Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
				<DialogContent
					showCloseButton={false}
					className={cn(
						"flex flex-col p-0 gap-0",
						preview?.contentType === "application/pdf"
							? "max-w-4xl h-[85vh]"
							: "max-w-3xl"
					)}
				>
					<DialogHeader>
						<DialogTitle className="sr-only">{preview?.name}</DialogTitle>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<p className="truncate pr-8 text-sm font-medium text-foreground">
								{preview?.name}
							</p>
							<div className="flex items-center gap-2">
								{preview ? (
									<Button
										size="sm"
										variant="outline"
										onClick={() => window.open(preview.url, "_blank", "noopener,noreferrer")}
									>
										<Download className="mr-1.5 h-3.5 w-3.5" />
										{t("project.file.download")}
									</Button>
								) : null}
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									aria-label="Close preview"
									onClick={() => setPreview(null)}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</DialogHeader>
					<div className="flex-1 overflow-hidden">
						{preview && isImage(preview.contentType) ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={preview.url}
								alt={preview.name}
								className="mx-auto max-h-[75vh] rounded-b-lg object-contain p-2"
							/>
						) : preview ? (
							<iframe
								src={preview.url}
								title={preview.name}
								className="h-full w-full rounded-b-lg"
								style={{ minHeight: "calc(85vh - 57px)" }}
							/>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation dialog (single + multi) */}
			<Dialog open={deleteTargets.length > 0} onOpenChange={(open) => { if (!open) setDeleteTargets([]); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{isMultiDelete
								? t("project.file.deleteMultipleTitle")
								: t("project.file.deleteTitle")}
						</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{isMultiDelete
							? t("project.file.deleteMultipleConfirm").replace("{count}", String(deleteTargets.length))
							: t("project.file.deleteConfirm")}
					</p>
					{deleteTargets.length > 0 ? (
						<div className="max-h-52 space-y-2 overflow-y-auto">
							{deleteTargets.slice(0, 5).map((f) => (
								<div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
										<File className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">{f.originalName}</p>
										<p className="text-xs text-muted-foreground">{formatFileSize(f.sizeBytes)}</p>
									</div>
								</div>
							))}
							{deleteTargets.length > 5 ? (
								<p className="pl-1 text-xs text-muted-foreground">
									+{deleteTargets.length - 5} ...
								</p>
							) : null}
						</div>
					) : null}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => setDeleteTargets([])}>
							{t("common.cancel")}
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={deleting}
							onClick={() => void confirmDelete()}
						>
							<Trash2 className="mr-1.5 h-3.5 w-3.5" />
							{isMultiDelete
								? `${t("project.file.delete")} (${deleteTargets.length})`
								: t("project.file.delete")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Notes dialog */}
			<FileNotesDialog
				file={notesFile}
				onClose={() => setNotesFile(null)}
				request={request}
				currentUserId={currentUserId}
				isAdmin={isAdmin}
				locale={locale}
				t={t}
				onNotesChanged={loadFiles}
			/>
		</TooltipProvider>
	);
}

/* ─── File Notes Dialog ─── */

function FileNotesDialog({
	file,
	onClose,
	request,
	currentUserId,
	isAdmin,
	locale,
	t,
	onNotesChanged,
}: {
	file: FileItem | null;
	onClose: () => void;
	request: <T>(path: string, options?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }) => Promise<T>;
	currentUserId: string;
	isAdmin: boolean;
	locale: string;
	t: (key: string) => string;
	onNotesChanged: () => void;
}) {
	const [notes, setNotes] = useState<FileNoteItem[]>([]);
	const [loadingNotes, setLoadingNotes] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	const loadNotes = useCallback(async () => {
		if (!file) return;
		setLoadingNotes(true);
		try {
			const data = await request<FileNoteItem[]>(`/files/${file.id}/notes`);
			setNotes(data);
			setError(null);
		} catch {
			setError(t("project.file.loadError"));
		} finally {
			setLoadingNotes(false);
		}
	}, [file, request, t]);

	useEffect(() => {
		if (file) {
			void loadNotes();
			setNoteText("");
			setError(null);
		}
	}, [file, loadNotes]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [notes]);

	async function handleSubmit() {
		if (!file || !noteText.trim()) return;
		setSubmitting(true);
		try {
			await request(`/files/${file.id}/notes`, {
				method: "POST",
				body: { content: noteText.trim() },
			});
			setNoteText("");
			await loadNotes();
			void onNotesChanged();
		} catch {
			setError(t("project.file.noteCreateError"));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDeleteNote(noteId: string) {
		try {
			await request(`/files/notes/${noteId}`, { method: "DELETE" });
			await loadNotes();
			void onNotesChanged();
		} catch {
			setError(t("project.file.noteDeleteError"));
		}
	}

	return (
		<Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogContent className="flex max-w-lg flex-col gap-0 p-0 sm:max-h-[80vh]">
				<DialogHeader className="border-b px-4 py-3">
					<DialogTitle className="text-sm font-semibold">
						{t("project.file.notesTitle")}
					</DialogTitle>
					{file ? (
						<p className="truncate text-xs text-muted-foreground">{file.originalName}</p>
					) : null}
				</DialogHeader>

				<div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: "50vh", minHeight: "200px" }}>
					{loadingNotes ? (
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="h-8 w-8 shrink-0 rounded-full" />
									<div className="flex-1 space-y-1">
										<Skeleton className="h-3 w-24" />
										<Skeleton className="h-4 w-full" />
									</div>
								</div>
							))}
						</div>
					) : notes.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-10 text-center">
							<div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
								<MessageSquare className="h-5 w-5 text-muted-foreground" />
							</div>
							<p className="text-sm text-muted-foreground">{t("project.file.notesEmpty")}</p>
						</div>
					) : (
						<div className="space-y-4">
							{notes.map((note) => {
								const canDelete = isAdmin || note.authorId === currentUserId;
								return (
									<div key={note.id} className="group flex gap-3">
										<div className={cn(
											"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
											note.authorRole === "ADMIN"
												? "bg-primary/10 text-primary"
												: "bg-blue-500/10 text-blue-600"
										)}>
											{getInitials(note.authorName)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="text-xs font-medium text-foreground">{note.authorName}</span>
												<Badge variant="outline" className="text-[10px] px-1.5 py-0">
													{note.authorRole === "ADMIN" ? "Admin" : "Client"}
												</Badge>
												<span className="text-[10px] text-muted-foreground">
													{new Date(note.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
												</span>
												{canDelete ? (
													<button
														type="button"
														className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
														onClick={() => void handleDeleteNote(note.id)}
													>
														<X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
													</button>
												) : null}
											</div>
											<p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="border-t px-4 py-3">
					{error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
					<div className="flex gap-2">
						<textarea
							className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							rows={2}
							placeholder={t("project.file.notesPlaceholder")}
							value={noteText}
							onChange={(e) => setNoteText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
									e.preventDefault();
									void handleSubmit();
								}
							}}
						/>
						<Button
							size="sm"
							className="h-auto self-end"
							disabled={!noteText.trim() || submitting}
							onClick={() => void handleSubmit()}
						>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/* ─── Internal components ─── */

function FileThumbnail({
	file,
	thumbnailUrl,
	isLoadingUrl,
}: {
	file: FileItem;
	thumbnailUrl: string | null;
	isLoadingUrl: boolean;
}) {
	const Icon = CATEGORY_ICONS[file.category] ?? File;
	const colors = CATEGORY_COLORS[file.category] ?? CATEGORY_COLORS.OTHER!;

	if (isImage(file.contentType) && file.isUploaded) {
		if (isLoadingUrl || !thumbnailUrl) {
			return (
				<div className="flex h-36 items-center justify-center overflow-hidden rounded-t-xl bg-muted/30">
					<Skeleton className="h-full w-full rounded-none" />
				</div>
			);
		}
		return (
			<div className="h-36 overflow-hidden rounded-t-xl bg-muted/30">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={thumbnailUrl}
					alt={file.originalName}
					loading="lazy"
					className="h-full w-full object-cover"
				/>
			</div>
		);
	}

	return (
		<div className={`flex h-36 items-center justify-center rounded-t-xl ${colors.bg}`}>
			<div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colors.bg}`}>
				<Icon className={`h-7 w-7 ${colors.text}`} />
			</div>
		</div>
	);
}

function FileCard({
	file,
	thumbnailUrl,
	isLoadingUrl,
	locale,
	isAdmin,
	selected,
	selectionMode,
	onPreview,
	onDownload,
	onDelete,
	onNotes,
	onToggleSelect,
	t,
}: {
	file: FileItem;
	thumbnailUrl: string | null;
	isLoadingUrl: boolean;
	locale: string;
	isAdmin: boolean;
	selected: boolean;
	selectionMode: boolean;
	onPreview: (file: FileItem) => void;
	onDownload: (id: string) => void;
	onDelete: (file: FileItem) => void;
	onNotes: (file: FileItem) => void;
	onToggleSelect: (id: string) => void;
	t: (key: string) => string;
}) {
	return (
		<div
			className={cn(
				"group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
				selected ? "border-primary ring-2 ring-primary/20" : "border-border/40"
			)}
		>
			<FileThumbnail file={file} thumbnailUrl={thumbnailUrl} isLoadingUrl={isLoadingUrl} />

			{/* Selection checkbox (top-left) — visible on hover or when in selection mode */}
			{isAdmin ? (
				<button
					type="button"
					className={cn(
						"absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all",
						selected
							? "border-primary bg-primary text-white"
							: "border-white/70 bg-black/30 text-transparent hover:border-white hover:bg-black/50",
						selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
					)}
					onClick={(e) => {
						e.stopPropagation();
						onToggleSelect(file.id);
					}}
				>
					<Check className="h-3.5 w-3.5" strokeWidth={3} />
				</button>
			) : null}

			{/* Hover overlay with action buttons */}
			<div className="absolute inset-x-0 top-0 flex h-36 items-center justify-center gap-2 rounded-t-xl bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
				{isPreviewable(file.contentType) && file.isUploaded ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={() => void onPreview(file)}>
								<Eye className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("project.file.preview")}</TooltipContent>
					</Tooltip>
				) : null}
				{file.isUploaded ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={() => void onDownload(file.id)}>
								<Download className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("project.file.download")}</TooltipContent>
					</Tooltip>
				) : null}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={() => onNotes(file)}>
							<MessageSquare className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{t("project.file.notes")}</TooltipContent>
				</Tooltip>
				{isAdmin ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="sm" variant="destructive" className="h-9 w-9 p-0" onClick={() => onDelete(file)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("project.file.delete")}</TooltipContent>
					</Tooltip>
				) : null}
			</div>

			{/* File metadata */}
			<div className="space-y-1 p-3">
				<p className="truncate text-sm font-medium text-foreground" title={file.originalName}>
					{file.originalName}
				</p>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{formatFileSize(file.sizeBytes)}</span>
					<span className="text-border">·</span>
					<span>{new Date(file.createdAt).toLocaleDateString(locale)}</span>
					{file.versionLabel ? (
						<Badge className="ml-auto text-[10px]">{file.versionLabel}</Badge>
					) : null}
					{file.noteCount > 0 ? (
						<button
							type="button"
							className="ml-auto flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
							onClick={() => onNotes(file)}
						>
							<MessageSquare className="h-3 w-3" />
							<span className="text-[10px]">{file.noteCount}</span>
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}

function FileGrid({
	files,
	locale,
	isAdmin,
	selectedIds,
	selectionMode,
	thumbnailUrls,
	loadingUrls,
	onDownload,
	onDelete,
	onPreview,
	onNotes,
	onToggleSelect,
	t,
}: {
	files: FileItem[];
	locale: string;
	isAdmin: boolean;
	selectedIds: Set<string>;
	selectionMode: boolean;
	thumbnailUrls: Map<string, string>;
	loadingUrls: Set<string>;
	onDownload: (id: string) => void;
	onDelete: (file: FileItem) => void;
	onPreview: (file: FileItem) => void;
	onNotes: (file: FileItem) => void;
	onToggleSelect: (id: string) => void;
	t: (key: string) => string;
}) {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{files.map((file) => (
				<FileCard
					key={file.id}
					file={file}
					thumbnailUrl={thumbnailUrls.get(file.id) ?? null}
					isLoadingUrl={loadingUrls.has(file.id)}
					locale={locale}
					isAdmin={isAdmin}
					selected={selectedIds.has(file.id)}
					selectionMode={selectionMode}
					onPreview={onPreview}
					onDownload={onDownload}
					onDelete={onDelete}
					onNotes={onNotes}
					onToggleSelect={onToggleSelect}
					t={t}
				/>
			))}
		</div>
	);
}
