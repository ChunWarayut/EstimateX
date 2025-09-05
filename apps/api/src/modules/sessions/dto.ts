import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested, IsObject } from 'class-validator';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateSessionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  deck?: number[];

  @IsOptional()
  @IsObject()
  roleDecks?: Record<string, number[]>;
}

export class JoinDto {
  @IsString()
  name!: string;

  @IsEnum(Role)
  role!: Role;
}

export class VoteDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  value!: number;

  @IsString()
  userId!: string;
}
