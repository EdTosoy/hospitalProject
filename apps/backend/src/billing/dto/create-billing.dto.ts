import { Transform } from 'class-transformer';
import { BillingStatus } from '../../database/schema';
import {
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateBillingDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['PHP'])
  currency?: 'PHP';

  @IsNotEmpty()
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Max(9999999999.99)
  @Min(0)
  amount!: number;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(BillingStatus)
  status?: BillingStatus;
}
