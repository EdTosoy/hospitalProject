import { AppointmentStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateAppointmentDto {

    @IsNotEmpty()
    @IsString()
    patientId!: string;

    @IsOptional()
    @IsString()
    doctorId?: string;

    @IsNotEmpty()
    @IsDateString()
    dateTime!: string;

    @IsNotEmpty()
    @IsString()
    reason!: string;

    @IsOptional()
    @IsEnum(AppointmentStatus)
    status?: AppointmentStatus;

}
