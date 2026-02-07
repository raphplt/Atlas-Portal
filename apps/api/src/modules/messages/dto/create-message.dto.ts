import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @IsString()
  @MaxLength(5000)
  body!: string;
}
