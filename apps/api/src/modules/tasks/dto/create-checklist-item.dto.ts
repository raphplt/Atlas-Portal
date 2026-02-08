import { IsString, MaxLength } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  @MaxLength(255)
  title!: string;
}
