import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateSessionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
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

