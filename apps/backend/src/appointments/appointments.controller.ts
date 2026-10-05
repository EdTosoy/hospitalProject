import type { AuthenticatedRequest } from '../database/access';
import {
  Controller,
  Request,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Role } from '../database/schema';
import { Roles } from '../auth/roles/roles.decorators';

@ApiBearerAuth()
@Roles(Role.PATIENT, Role.DOCTOR, Role.NURSE, Role.FRONT_DESK, Role.ADMIN)
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT, Role.DOCTOR, Role.FRONT_DESK, Role.NURSE, Role.ADMIN)
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(createAppointmentDto, req.user);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.appointmentsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, req.user);
  }

  @Roles(Role.PATIENT, Role.DOCTOR, Role.NURSE, Role.FRONT_DESK, Role.ADMIN)
  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto, req.user);
  }

  @Roles(Role.ADMIN, Role.FRONT_DESK)
  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointmentsService.remove(id, req.user);
  }
}
