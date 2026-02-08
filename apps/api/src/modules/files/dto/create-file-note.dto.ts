import { IsString, MaxLength } from 'class-validator';

export class CreateFileNoteDto {
  @IsString()
  @MaxLength(5000)
  content!: string;
}
