import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  IsEmail,
} from 'class-validator';
import {
  MilestoneType,
  ProjectMilestoneTemplate,
  ProjectStatus,
} from '../../../common/enums';

export class UpdateProjectDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientCompany?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  clientEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientWebsite?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nextAction?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedDeliveryAt?: Date | null;

  @IsOptional()
  @IsEnum(ProjectMilestoneTemplate)
  milestoneTemplate?: ProjectMilestoneTemplate;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(MilestoneType, { each: true })
  milestoneTypes?: MilestoneType[];
}
