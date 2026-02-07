import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TicketActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
