import { IsString, MaxLength } from 'class-validator';

export class UpdateAdminNoteDto {
  @IsString()
  @MaxLength(5000)
  content!: string;
}
