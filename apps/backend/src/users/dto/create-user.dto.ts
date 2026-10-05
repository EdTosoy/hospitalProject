import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../database/schema';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsByteLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'jane@hospital.com',
    description: 'User unique email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsByteLength(0, 72, { message: 'Password must be at most 72 UTF-8 bytes' })
  password!: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'DOCTOR', enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
