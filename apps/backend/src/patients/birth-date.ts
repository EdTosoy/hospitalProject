import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// DOB is a calendar date. Accept legacy ISO timestamps but preserve their date
// component rather than converting their offset to a different day.
export const birthDate = (value: string) => value.slice(0, 10);
export const storedBirthDate = (value: string) =>
  new Date(`${birthDate(value)}T00:00:00.000Z`);

@ValidatorConstraint({ name: 'notFutureBirthDate', async: false })
export class NotFutureBirthDate implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value) &&
      birthDate(value) <= new Date().toISOString().slice(0, 10)
    );
  }
  defaultMessage() {
    return 'Date of birth must be a valid calendar date no later than today (UTC)';
  }
}
