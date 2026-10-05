import type { AuthenticatedRequest } from '../database/access';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles/roles.decorators';
import { Role } from '../database/schema';
import { RolesGuard } from '../auth/roles/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createPatientDto: CreatePatientDto,
  ) {
    return this.patientsService.create(
      req.user.userId,
      createPatientDto,
      req.user,
    );
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.NURSE, Role.FRONT_DESK, Role.DOCTOR, Role.ADMIN)
  registerWalking(
    @Request() req: AuthenticatedRequest,
    @Body() createPatientDto: CreatePatientDto,
  ) {
    return this.patientsService.registerWalkIn(createPatientDto, req.user);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.patientsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.patientsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.NURSE, Role.FRONT_DESK, Role.ADMIN)
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, updatePatientDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.DOCTOR, Role.NURSE, Role.FRONT_DESK, Role.ADMIN)
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.patientsService.remove(id, req.user);
  }
}
