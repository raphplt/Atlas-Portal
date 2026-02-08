'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { getErrorMessage } from '@/lib/api-error';
import { FileItem } from '@/lib/portal/types';
import { Download, File, Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface TaskAttachmentsProps {
  taskId: string;
  isAdmin: boolean;
  files: FileItem[];
  onFilesChange: () => void;
}

export function TaskAttachments({ taskId, isAdmin, files, onFilesChange }: TaskAttachmentsProps) {
  const { t } = useTranslations();
  const { request, projectId } = useProjectContext();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(acceptedFiles: globalThis.File[]) {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Get signed upload URL
      const { fileId, uploadUrl } = await request<{
        fileId: string;
        uploadUrl: string;
        key: string;
      }>('/files/upload-url', {
        method: 'POST',
        body: {
          projectId,
          taskId,
          originalName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          category: 'OTHER',
        },
      });

      // 2. Upload directly to R2
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // 3. Complete upload
      await request(`/files/${fileId}/complete`, {
        method: 'POST',
        body: {},
      });

      onFilesChange();
    } catch (e) {
      toast.error(getErrorMessage(e, t, 'project.file.uploadError'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileId: string) {
    try {
      const { downloadUrl } = await request<{ downloadUrl: string }>(
        `/files/${fileId}/download-url`,
      );
      window.open(downloadUrl, '_blank');
    } catch (e) {
      toast.error(getErrorMessage(e, t, 'project.file.downloadError'));
    }
  }

  async function handleDelete(fileId: string) {
    try {
      await request(`/files/${fileId}`, { method: 'DELETE' });
      onFilesChange();
    } catch (e) {
      toast.error(getErrorMessage(e, t, 'project.file.deleteError'));
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => void handleUpload(accepted),
    multiple: false,
    maxSize: 20 * 1024 * 1024,
    disabled: uploading || !isAdmin,
  });

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">
          {t('project.task.attachments')}
        </h4>
        {files.length > 0 ? (
          <span className="text-xs text-muted-foreground">{files.length}</span>
        ) : null}
      </div>

      {/* File list */}
      {files.length > 0 ? (
        <div className="space-y-1">
          {files.map((file) => (
            <div key={file.id} className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate text-foreground">{file.originalName}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(file.sizeBytes)}</p>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => void handleDownload(file.id)}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  onClick={() => void handleDelete(file.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Upload zone (admin only) */}
      {isAdmin ? (
        <div
          {...getRootProps()}
          className={`rounded-lg border border-dashed p-3 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">
            {uploading ? t('project.file.uploading') : t('project.file.dragOrClick')}
          </p>
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('project.task.noAttachments')}</p>
      ) : null}
    </div>
  );
}
