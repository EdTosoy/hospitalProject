import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { storedBirthDate } from './birth-date';

describe('Birth dates and demographic validation', () => {
  const profile = {
    firstName: '李',
    lastName: 'D’Arcy-山田',
    dob: '2000-02-29',
    gender: 'OTHER',
    phone: '+81 (0)3 1234 5678 ext. 9',
  };
  const errors = (value: object) =>
    validate(plainToInstance(CreatePatientDto, value));
  it.each([
    '1990-01-02',
    '1990-01-02T00:00:00+08:00',
    '1990-01-02T23:00:00-08:00',
  ])('stores the calendar component of %s at UTC midnight', (value) => {
    expect(storedBirthDate(value).toISOString()).toBe(
      '1990-01-02T00:00:00.000Z',
    );
  });
  it('validates today and tomorrow by a stable UTC calendar boundary', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-01-01T23:59:59Z'));
    try {
      expect(await errors({ ...profile, dob: '2026-01-01' })).toHaveLength(0);
      expect(await errors({ ...profile, dob: '2026-01-02' })).not.toHaveLength(
        0,
      );
    } finally {
      jest.useRealTimers();
    }
  });
  it.each(['2001-02-29', '2000-02-30', '1990-01-01garbage', '2999-01-01', ''])(
    'rejects invalid/future DOB %s',
    async (dob) => {
      expect(await errors({ ...profile, dob })).not.toHaveLength(0);
    },
  );
  it('keeps international names and contact formats and trims required text', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      ...profile,
      firstName: ' 李 ',
      phone: ' +81 (0)3 1234 5678 ext. 9 ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.firstName).toBe('李');
    expect(dto.phone).toBe(profile.phone);
  });
  it('validates only supplied fields on partial updates of legacy records', async () => {
    expect(
      await validate(
        plainToInstance(UpdatePatientDto, { address: '住所 · Address' }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(plainToInstance(UpdatePatientDto, { dob: null })),
    ).not.toHaveLength(0);
  });
});
