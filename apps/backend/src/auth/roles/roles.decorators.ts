import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

// This is the metadata key we read in the Guard
export const ROLES_KEY = 'roles';

// This function allows us to use @Roles(Role.ADMIN) on any controller
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
