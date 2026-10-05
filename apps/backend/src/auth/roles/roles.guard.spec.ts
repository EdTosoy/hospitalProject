import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
describe('RolesGuard', () => {
  const metadata = jest.fn();
  const guard = new RolesGuard({
    getAllAndOverride: metadata,
  } as unknown as Reflector);
  function context(role?: string) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    } as unknown as ExecutionContext;
  }
  it('allows routes without role restrictions', () => {
    metadata.mockReturnValue(undefined);
    expect(guard.canActivate(context())).toBe(true);
  });
  it('denies missing identities and unauthorized roles', () => {
    metadata.mockReturnValue(['DOCTOR']);
    expect(guard.canActivate(context())).toBe(false);
    expect(guard.canActivate(context('PATIENT'))).toBe(false);
  });
  it('allows matching roles', () => {
    metadata.mockReturnValue(['DOCTOR']);
    expect(guard.canActivate(context('DOCTOR'))).toBe(true);
  });
});
