import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FileCategory } from '../../../common/enums';

/** Allowed MIME types for file uploads. */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  // Text
  'text/plain',
  'text/csv',
  // Video
  'video/mp4',
  'video/quicktime',
  // Design
  'application/x-figma',
  'application/sketch',
] as const;

export class CreateUploadUrlDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @MaxLength(255)
  @Matches(/^[^/\\]+$/, {
    message: 'File name must not contain path separators',
  })
  originalName!: string;

  @IsString()
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `Content type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
  })
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  sizeBytes!: number;

  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  versionLabel?: string;
}
