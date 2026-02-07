import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterAdminDto {
  @IsString()
  @MaxLength(120)
  workspaceName!: string;

  @IsString()
  @Length(3, 120)
  @Matches(/^[a-z0-9-]+$/)
  workspaceSlug!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  locale?: string;
}
