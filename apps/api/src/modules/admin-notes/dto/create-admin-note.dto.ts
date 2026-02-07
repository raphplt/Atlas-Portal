import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAdminNoteDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;
}
