import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MilestoneType } from '../../../common/enums';

export class ValidateMilestoneDto {
  @IsEnum(MilestoneType)
  type!: MilestoneType;

  @IsBoolean()
  validated!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;
}
