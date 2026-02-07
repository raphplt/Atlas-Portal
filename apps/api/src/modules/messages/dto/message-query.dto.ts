import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MessageQueryDto extends PaginationQueryDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsUUID()
  ticketId?: string;
}
