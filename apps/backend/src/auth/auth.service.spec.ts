import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
describe('AuthService', () => {
  const users = { findOneByEmail: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
  const service = new AuthService(
    users as unknown as UsersService,
    jwt as unknown as JwtService,
    {
      audit: jest.fn().mockResolvedValue({ id: 'session-id' }),
    } as unknown as DatabaseService,
  );
  beforeEach(() => jest.clearAllMocks());
  it('rejects unknown users with generic credentials errors', async () => {
    users.findOneByEmail.mockResolvedValue(undefined);
    await expect(
      service.login({ email: 'missing@example.test', password: 'password' }),
    ).rejects.toThrow('Invalid credentials');
    expect(jwt.sign).not.toHaveBeenCalled();
  });
  it('rejects incorrect passwords without signing a token', async () => {
    users.findOneByEmail.mockResolvedValue({
      password: await bcrypt.hash('correct-password', 4),
    });
    await expect(
      service.login({ email: 'user@example.test', password: 'wrong-password' }),
    ).rejects.toThrow('Invalid credentials');
    expect(jwt.sign).not.toHaveBeenCalled();
  });
  it('returns a signed token and safe user fields after password verification', async () => {
    users.findOneByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.test',
      role: 'PATIENT',
      name: 'Patient',
      password: await bcrypt.hash('correct-password', 4),
    });
    const result = await service.login({
      email: 'user@example.test',
      password: 'correct-password',
    });
    expect(result.access_token).toBe('signed-token');
    expect(result.user).toEqual({
      id: 'user-id',
      email: 'user@example.test',
      role: 'PATIENT',
      name: 'Patient',
    });
    expect(jwt.sign).toHaveBeenCalledWith({
      sid: expect.any(String),
      sub: 'user-id',
      email: 'user@example.test',
      role: 'PATIENT',
      name: 'Patient',
    });
  });
});
