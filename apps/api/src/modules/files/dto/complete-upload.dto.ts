import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteUploadDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;
}
