import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from './schema';
export interface Actor {
  userId: string;
  role: Role;
  email: string;
  sessionId?: string;
}
export function requireStaff(actor: Actor) {
  if (actor.role === 'PATIENT') throw new ForbiddenException();
}
export function requireOwner(actor: Actor, owner: string | null) {
  if (actor.role !== 'ADMIN' && actor.userId !== owner)
    throw new ForbiddenException();
}
export function found<T>(row: T | undefined): T {
  if (!row) throw new NotFoundException('Record not found');
  return row;
}
export const publicUserColumns = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;
export function publicUser<T extends { password: string }>(user: T) {
  const { password: _password, ...safe } = user;
  return safe;
}

export type AuthenticatedRequest = import('express').Request & { user: Actor };
