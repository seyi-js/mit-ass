import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus, RoleName } from './entities';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const email = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @ApiProperty({ example: 'student@example.edu' })
  @Transform(email)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, format: 'password' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({ example: 'Amina Bello', minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: [RoleName.STUDENT, RoleName.STAFF] })
  @IsIn([RoleName.STUDENT, RoleName.STAFF])
  role!: RoleName;
}

export class CreateUserDto extends LoginDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  role!: RoleName;
}

export class UpdateUserDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  role!: RoleName;

  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}

export class RequestDto {
  @ApiProperty({
    example: 'Leaking pipe in hostel bathroom',
    minLength: 5,
    maxLength: 120,
  })
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ minLength: 10, maxLength: 3000 })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  description!: string;

  @ApiProperty({
    example: 'Hostel B, first floor',
    minLength: 3,
    maxLength: 200,
  })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  location!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;
}

export class AssignDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  officerId!: string;
}

export class StatusDto {
  @ApiProperty({ enum: [RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED] })
  @IsIn([RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED])
  status!: RequestStatus;

  @ApiProperty({ minLength: 3, maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note!: string;
}

export class PageQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class RequestQuery extends PageQuery {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class UserQuery extends PageQuery {
  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;
}

export class ReportQuery {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
