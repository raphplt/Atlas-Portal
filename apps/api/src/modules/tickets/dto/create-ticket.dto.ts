import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TicketType } from '../../../common/enums';

export class CreateTicketDto {
  @IsUUID()
  projectId!: string;

  @IsEnum(TicketType)
  type!: TicketType;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsBoolean()
  requiresPayment?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentDescription?: string;
}
