import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { FileCategory } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FileQueryDto extends PaginationQueryDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;
}
