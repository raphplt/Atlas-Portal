import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ClientInvitationStatus } from '../../../common/enums';

export class InvitationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ClientInvitationStatus)
  status?: ClientInvitationStatus;
}
