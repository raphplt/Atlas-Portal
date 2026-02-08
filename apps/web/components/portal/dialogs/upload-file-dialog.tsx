'use client';

import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useProjectContext } from '@/components/portal/project-context';
import { useTranslations } from '@/components/providers/translation-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { File, FileImage, FileText, Upload, X } from 'lucide-react';

const selectClasses = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

/** Backend-allowed MIME types mapped to extensions for react-dropzone `accept` */
const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage;
  if (type === 'application/pdf') return FileText;
  return File;
}

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UploadFileDialog({ open, onOpenChange, onSuccess }: UploadFileDialogProps) {
  const { t } = useTranslations();
  const { request, projectId } = useProjectContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState('OTHER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCategory('OTHER');
    setError(null);
    setSubmitting(false);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (!file) return;
    setSelectedFile(file);

    // Generate image preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    onDropRejected: (rejections) => {
      const rejection = rejections[0];
      if (rejection?.errors[0]?.code === 'file-too-large') {
        setError(t('project.file.tooLarge'));
      } else {
        setError(t('project.file.invalidFile'));
      }
    },
  });

  const removeFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  }, [previewUrl]);

  async function handleUpload() {
    if (!selectedFile) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      formData.append('category', category);

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/files/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? 'Upload failed');
      }

      resetState();
      onSuccess();
      onOpenChange(false);
    } catch {
      setError(t('project.actionError'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetState();
    onOpenChange(open);
  }

  const FileIcon = useMemo(() => (selectedFile ? getFileIcon(selectedFile.type) : File), [selectedFile]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('project.file.upload')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Dropzone or file preview */}
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                isDragActive && !isDragReject && 'border-primary bg-primary/5',
                isDragReject && 'border-destructive bg-destructive/5',
                !isDragActive && 'border-border hover:border-primary/50 hover:bg-muted/30',
              )}
            >
              <input {...getInputProps()} />
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? t('project.file.dropHere') : t('project.file.dragOrClick')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('project.file.maxSize')}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
              {/* File preview */}
              {previewUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={selectedFile.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
              {/* Remove button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Category */}
          <div>
            <Label htmlFor="file-category">{t('project.file.category')}</Label>
            <select
              id="file-category"
              className={selectClasses}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="BRANDING">{t('status.file.BRANDING')}</option>
              <option value="CONTENT">{t('status.file.CONTENT')}</option>
              <option value="DELIVERABLE">{t('status.file.DELIVERABLE')}</option>
              <option value="OTHER">{t('status.file.OTHER')}</option>
            </select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              disabled={!selectedFile || submitting}
              onClick={() => void handleUpload()}
            >
              {submitting ? t('project.file.uploading') : t('project.file.upload')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
