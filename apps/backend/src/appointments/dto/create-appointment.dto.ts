import { Transform } from 'class-transformer';
import { AppointmentStatus } from '../../database/schema';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsNotEmpty()
  @IsDateString({ strict: true })
  dateTime!: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
