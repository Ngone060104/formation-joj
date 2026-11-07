import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Discipline } from '../../disciplines/domain/discipline';
import { DrizzleDisciplineRepository } from '../../disciplines/infra/drizzle-discipline.repository';
import { Registration } from '../domain/registration';
import { Slot } from '../domain/slot';
import { DrizzleSlotRepository } from './drizzle-slot.repository';
import { toDomain } from './registration.mapper';
import { registrations } from './volunteers.schema';

const newRegistration = (slotId: string, name = 'Awa Diop') =>
  Registration.create({
    id: randomUUID(),
    slotId,
    name,
    email: 'awa@example.org',
    now: new Date('2026-10-31T09:00:00.123Z'),
  });

describe('DrizzleSlotRepository (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzleSlotRepository;
  let disciplineId: string;

  const newSlot = async (capacity: number) => {
    const slot = Slot.create({
      id: randomUUID(),
      disciplineId,
      startsAt: new Date('2026-11-01T09:00:00.000Z'),
      endsAt: new Date('2026-11-01T12:00:00.000Z'),
      capacity,
      now: new Date(),
    });
    await repository.insert(slot);
    return slot;
  };

  const savedRegistrations = async (slotId: string) => {
    const rows = await connection.db
      .select()
      .from(registrations)
      .where(eq(registrations.slotId, slotId));
    return rows.map(toDomain);
  };

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzleSlotRepository(connection.db);
    const discipline = Discipline.create({
      id: randomUUID(),
      name: 'Lutte',
      category: 'sports-de-combat',
      now: new Date(),
    });
    await new DrizzleDisciplineRepository(connection.db).insert(discipline);
    disciplineId = discipline.id;
  });

  afterAll(() => connection?.close());

  it('001-AS5: saves the registration and returns the slot with one place taken', async () => {
    const slot = await newSlot(2);
    const registration = newRegistration(slot.id);

    const updated = await repository.addRegistration(registration);

    expect(updated.remainingPlaces).toBe(1);
    expect(await savedRegistrations(slot.id)).toEqual([registration]);
  });

  it('001-AS6: accepts the last place, and leaves none', async () => {
    const slot = await newSlot(1);

    const updated = await repository.addRegistration(newRegistration(slot.id));

    expect(updated.remainingPlaces).toBe(0);
  });

  it('001-AS7: refuses a full slot, and keeps its two registrations', async () => {
    const slot = await newSlot(2);
    await repository.addRegistration(newRegistration(slot.id));
    await repository.addRegistration(newRegistration(slot.id));

    await expect(repository.addRegistration(newRegistration(slot.id))).rejects.toMatchObject({
      code: 'SLOT_FULL',
    });
    expect(await savedRegistrations(slot.id)).toHaveLength(2);
  });

  it('001-AS8: accepts only one of two simultaneous registrations for the last place', async () => {
    const slot = await newSlot(1);

    const results = await Promise.allSettled([
      repository.addRegistration(newRegistration(slot.id, 'Awa Diop')),
      repository.addRegistration(newRegistration(slot.id, 'Moussa Fall')),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ code: 'SLOT_FULL' }) }),
    ]);
    expect(await savedRegistrations(slot.id)).toHaveLength(1);
  });

  it('001-AS9: refuses an unknown slot, and saves nothing', async () => {
    const slotId = randomUUID();

    await expect(repository.addRegistration(newRegistration(slotId))).rejects.toMatchObject({
      code: 'SLOT_NOT_FOUND',
    });
    expect(await savedRegistrations(slotId)).toEqual([]);
  });
});
