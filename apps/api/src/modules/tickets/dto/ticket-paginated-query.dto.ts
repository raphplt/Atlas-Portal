import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TicketQueryDto } from './ticket-query.dto';

export enum TicketViewFilter {
  ALL = 'ALL',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  CLOSED = 'CLOSED',
}

export enum TicketSortBy {
  PRIORITY = 'PRIORITY',
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  AMOUNT_DESC = 'AMOUNT_DESC',
  AMOUNT_ASC = 'AMOUNT_ASC',
}

export class TicketPaginatedQueryDto extends TicketQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }: { value: string }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 10;

  @IsOptional()
  @IsEnum(TicketViewFilter)
  view: TicketViewFilter = TicketViewFilter.ALL;

  @IsOptional()
  @IsEnum(TicketSortBy)
  sortBy: TicketSortBy = TicketSortBy.PRIORITY;
}
