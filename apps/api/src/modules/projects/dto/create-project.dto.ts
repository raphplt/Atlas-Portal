import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MilestoneType, ProjectMilestoneTemplate } from '../../../common/enums';

export class CreateProjectDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientCompany?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  clientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientWebsite?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedDeliveryAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nextAction?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

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
