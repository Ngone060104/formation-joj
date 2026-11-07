import { describe, expect, it } from 'vitest';
import { Slot } from './slot';

const startsAt = new Date('2026-11-01T09:00:00.000Z');
const endsAt = new Date('2026-11-01T12:00:00.000Z');
const now = new Date('2026-10-01T08:00:00.000Z');

const newSlot = (overrides: { capacity?: number; startsAt?: Date; endsAt?: Date } = {}) =>
  Slot.create({
    id: 'slot-1',
    disciplineId: 'discipline-1',
    startsAt,
    endsAt,
    capacity: 2,
    now,
    ...overrides,
  });

describe('Slot', () => {
  it('001-AS1: opens with all its places remaining', () => {
    const slot = newSlot();

    expect(slot.capacity).toBe(2);
    expect(slot.remainingPlaces).toBe(2);
    expect(slot.startsAt).toEqual(startsAt);
    expect(slot.endsAt).toEqual(endsAt);
    expect(slot.createdAt).toEqual(now);
  });

  it.each([0, -1, 1.5])('001-AS3: rejects a capacity of %d', (capacity) => {
    expect(() => newSlot({ capacity })).toThrowError(
      expect.objectContaining({ code: 'SLOT_CAPACITY_INVALID', kind: 'VALIDATION' }),
    );
  });

  it('001-AS3: accepts a capacity of 1', () => {
    expect(newSlot({ capacity: 1 }).remainingPlaces).toBe(1);
  });

  it.each([new Date('2026-11-01T08:00:00.000Z'), startsAt])(
    '001-AS4: rejects an end at %s, which is not after the start',
    (end) => {
      expect(() => newSlot({ endsAt: end })).toThrowError(
        expect.objectContaining({ code: 'SLOT_END_NOT_AFTER_START', kind: 'VALIDATION' }),
      );
    },
  );

  it('001-AS5: takes one place for a registration', () => {
    const slot = newSlot();

    slot.takePlace();

    expect(slot.remainingPlaces).toBe(1);
  });

  it('001-AS6: takes the last place without refusing', () => {
    const slot = newSlot();
    slot.takePlace();

    slot.takePlace();

    expect(slot.remainingPlaces).toBe(0);
  });

  it('001-AS7: refuses a place on a full slot, and stays full', () => {
    const slot = newSlot({ capacity: 1 });
    slot.takePlace();

    expect(() => slot.takePlace()).toThrowError(
      expect.objectContaining({ code: 'SLOT_FULL', kind: 'CONFLICT' }),
    );
    expect(slot.remainingPlaces).toBe(0);
  });
});
