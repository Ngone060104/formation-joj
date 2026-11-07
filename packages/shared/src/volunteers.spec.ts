import { describe, expect, it } from 'vitest';
import {
  createRegistrationSchema,
  createSlotSchema,
  VOLUNTEER_NAME_MAX_LENGTH,
} from './volunteers.ts';

const validSlot = {
  disciplineId: '0199f5c2-0000-7000-8000-000000000003',
  startsAt: '2026-11-01T09:00:00.000Z',
  endsAt: '2026-11-01T12:00:00.000Z',
  capacity: 2,
};

const validRegistration = { name: 'Awa Diop', email: 'awa@example.org' };

function issuePaths(result: { error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return (result.error?.issues ?? []).map((issue) => issue.path.join('.'));
}

describe('createSlotSchema', () => {
  it('001-AS3: rejects a capacity below 1, or that is not an integer', () => {
    for (const capacity of [0, -1, 1.5, 2 ** 31]) {
      const result = createSlotSchema.safeParse({ ...validSlot, capacity });
      expect(result.success).toBe(false);
      expect(issuePaths(result)).toEqual(['capacity']);
    }
  });

  it('001-AS3: accepts a capacity of 1', () => {
    expect(createSlotSchema.safeParse({ ...validSlot, capacity: 1 }).success).toBe(true);
  });

  it('001-AS4: rejects an end that is before the start, or equal to it', () => {
    for (const endsAt of ['2026-11-01T08:00:00.000Z', validSlot.startsAt]) {
      const result = createSlotSchema.safeParse({ ...validSlot, endsAt });
      expect(result.success).toBe(false);
      expect(issuePaths(result)).toEqual(['endsAt']);
    }
  });
});

describe('createRegistrationSchema', () => {
  it('001-AS10: rejects a name that is empty, blank or too long', () => {
    for (const name of ['', '   ', 'a'.repeat(VOLUNTEER_NAME_MAX_LENGTH + 1)]) {
      const result = createRegistrationSchema.safeParse({ ...validRegistration, name });
      expect(result.success).toBe(false);
      expect(issuePaths(result)).toEqual(['name']);
    }
  });

  it('001-AS10: rejects a name containing a NUL character', () => {
    const result = createRegistrationSchema.safeParse({
      ...validRegistration,
      name: `Awa${String.fromCharCode(0)}Diop`,
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['name']);
  });

  it('001-AS10: rejects a malformed email', () => {
    const result = createRegistrationSchema.safeParse({ ...validRegistration, email: 'awa' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['email']);
  });

  it('001-AS10: trims the name of a valid registration', () => {
    expect(createRegistrationSchema.parse({ ...validRegistration, name: ' Awa Diop ' })).toEqual(
      validRegistration,
    );
  });
});
