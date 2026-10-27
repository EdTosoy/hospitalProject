import { Gender } from '../../database/schema';
import { Transform } from 'class-transformer';
import { NotFutureBirthDate } from '../birth-date';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
} from 'class-validator';

export class CreatePatientDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200)
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(200)
  lastName!: string;

  @IsNotEmpty()
  @IsDateString({ strict: true })
  @Validate(NotFutureBirthDate)
  dob!: string;

  @IsNotEmpty()
  @IsEnum(Gender)
  gender!: Gender;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(64)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;
}
