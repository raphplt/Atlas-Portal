import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RequestPaymentDto {
  @IsInt()
  @Min(1)
  priceCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
