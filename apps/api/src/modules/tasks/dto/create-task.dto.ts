import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  MilestoneType,
  TaskPriority,
  TaskSource,
  TaskStatus,
} from '../../../common/enums';

export class CreateTaskDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskSource)
  source?: TaskSource;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MilestoneType)
  milestoneType?: MilestoneType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  blockedReason?: string;
}
