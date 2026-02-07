'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { UploadFileDialog } from '@/components/portal/dialogs/upload-file-dialog';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/api-error';
import { FileItem } from '@/lib/portal/types';
import { Download, Eye, File, FileImage, FileText, Trash2 } from "lucide-react";

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

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectFilesPage() {
	const { locale, projectId, project, error, setError, isAdmin, request } =
		useProjectContext();
	const { t } = useTranslations();

	const [files, setFiles] = useState<FileItem[]>([]);
	const [uploadOpen, setUploadOpen] = useState(false);
	const [categoryFilter, setCategoryFilter] = useState<string>("");
	const [preview, setPreview] = useState<{ url: string; name: string; contentType: string } | null>(null);

	const loadFiles = useCallback(async () => {
		try {
			const qs = new URLSearchParams({ projectId: projectId, limit: "100" });
			if (categoryFilter) qs.set("category", categoryFilter);
			const data = await request<FileItem[]>(`/files?${qs.toString()}`);
			setFiles(data);
			setError(null);
		} catch (e) {
			setError(getErrorMessage(e, t, "project.file.loadError"));
		}
	}, [projectId, request, setError, categoryFilter, t]);

	useEffect(() => {
		if (!project) return;
		void loadFiles();
	}, [loadFiles, project]);

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

	async function deleteFile(fileId: string) {
		try {
			await request(`/files/${fileId}`, { method: "DELETE" });
			await loadFiles();
		} catch (e) {
			setError(getErrorMessage(e, t, "project.file.deleteError"));
		}
	}

	async function previewFile(file: FileItem) {
		if (!isPreviewable(file.contentType)) return;
		try {
			const payload = await request<{ downloadUrl: string }>(
				`/files/${file.id}/download-url`,
			);
			if (isImage(file.contentType)) {
				setPreview({ url: payload.downloadUrl, name: file.originalName, contentType: file.contentType });
			} else {
				// PDF — open in new tab
				window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
			}
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

	// When a category filter is active, show flat list; otherwise show grouped
	const showGrouped = !categoryFilter;

	return (
		<>
			<div className="mb-4 flex justify-end">
				<Button onClick={() => setUploadOpen(true)}>
					{t("project.file.upload")}
				</Button>
			</div>

			<UploadFileDialog open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={() => void loadFiles()} />

			{error ? <p className="text-sm text-red-600">{error}</p> : null}

			{/* Category filter tabs */}
			<div className="mb-4 flex flex-wrap gap-1">
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

			{files.length === 0 ? <p>{t("files.empty")}</p> : null}

			{showGrouped ? (
				<div className="space-y-6">
					{CATEGORIES.map((cat) => {
						const catFiles = filesByCategory.get(cat) ?? [];
						if (catFiles.length === 0) return null;
						const Icon = CATEGORY_ICONS[cat] ?? File;
						return (
							<div key={cat}>
								<h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
									<Icon className="h-4 w-4" />
									{t(`status.file.${cat}`)}
									<span className="text-xs font-normal text-muted-foreground">
										({catFiles.length})
									</span>
								</h3>
								<FileList
									files={catFiles}
									locale={locale}
									isAdmin={isAdmin}
									onDownload={downloadFile}
									onDelete={deleteFile}
									onPreview={previewFile}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<FileList
					files={files}
					locale={locale}
					isAdmin={isAdmin}
					onDownload={downloadFile}
					onDelete={deleteFile}
					onPreview={previewFile}
				/>
			)}

			<Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
				<DialogContent className="max-w-3xl p-2">
					{preview ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={preview.url}
							alt={preview.name}
							className="mx-auto max-h-[80vh] rounded-md object-contain"
						/>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}

function FileList({
	files,
	locale,
	isAdmin,
	onDownload,
	onDelete,
	onPreview,
}: {
	files: FileItem[];
	locale: string;
	isAdmin: boolean;
	onDownload: (id: string) => void;
	onDelete: (id: string) => void;
	onPreview: (file: FileItem) => void;
}) {
	return (
		<div className="space-y-2">
			{files.map((file) => (
				<div
					key={file.id}
					className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
				>
					<div className="min-w-0 flex-1">
						<p className="font-medium text-foreground text-sm truncate">
							{file.originalName}
						</p>
						<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<span>{formatFileSize(file.sizeBytes)}</span>
							<span>{new Date(file.createdAt).toLocaleDateString(locale)}</span>
							{file.versionLabel ? (
								<Badge className="text-[10px]">{file.versionLabel}</Badge>
							) : null}
						</div>
					</div>
					<div className="flex items-center gap-1">
						{isPreviewable(file.contentType) && file.isUploaded ? (
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => void onPreview(file)}
							>
								<Eye className="h-3.5 w-3.5" />
							</Button>
						) : null}
						{file.isUploaded ? (
							<Button
								type="button"
								size="sm"
								variant="secondary"
								onClick={() => void onDownload(file.id)}
							>
								<Download className="h-3.5 w-3.5" />
							</Button>
						) : null}
						{isAdmin ? (
							<Button
								type="button"
								size="sm"
								variant="destructive"
								onClick={() => void onDelete(file.id)}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						) : null}
					</div>
				</div>
			))}
		</div>
	);
}
