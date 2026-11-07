import { VOLUNTEER_NAME_MAX_LENGTH } from '@joj/shared';
import { describe, expect, it } from 'vitest';
import { Registration } from './registration';

const now = new Date('2026-10-01T08:00:00.000Z');

const newRegistration = (overrides: { name?: string; email?: string } = {}) =>
  Registration.create({
    id: 'registration-1',
    slotId: 'slot-1',
    name: 'Awa Diop',
    email: 'awa@example.org',
    now,
    ...overrides,
  });

describe('Registration', () => {
  it('001-AS5: keeps the name, without surrounding spaces, and the email', () => {
    const registration = newRegistration({ name: ' Awa Diop ' });

    expect(registration.name).toBe('Awa Diop');
    expect(registration.email).toBe('awa@example.org');
    expect(registration.slotId).toBe('slot-1');
    expect(registration.createdAt).toEqual(now);
  });

  it.each(['', '   '])('001-AS10: rejects the name %j', (name) => {
    expect(() => newRegistration({ name })).toThrowError(
      expect.objectContaining({ code: 'VOLUNTEER_NAME_REQUIRED', kind: 'VALIDATION' }),
    );
  });

  it('001-AS10: rejects a name that is too long', () => {
    const name = 'a'.repeat(VOLUNTEER_NAME_MAX_LENGTH + 1);

    expect(() => newRegistration({ name })).toThrowError(
      expect.objectContaining({ code: 'VOLUNTEER_NAME_TOO_LONG', kind: 'VALIDATION' }),
    );
  });

  it('001-AS10: rejects a name containing a NUL character', () => {
    expect(() => newRegistration({ name: `Awa${String.fromCharCode(0)}Diop` })).toThrowError(
      expect.objectContaining({ code: 'VOLUNTEER_NAME_INVALID', kind: 'VALIDATION' }),
    );
  });

  it('001-AS10: rejects a malformed email', () => {
    expect(() => newRegistration({ email: 'awa' })).toThrowError(
      expect.objectContaining({ code: 'VOLUNTEER_EMAIL_INVALID', kind: 'VALIDATION' }),
    );
  });
});
