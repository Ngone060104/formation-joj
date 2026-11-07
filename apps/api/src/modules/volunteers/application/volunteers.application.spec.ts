import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { InMemoryDisciplineRepository } from '../../disciplines/application/testing/in-memory-discipline.repository';
import { GetDiscipline } from '../../disciplines/application/use-cases/get-discipline';
import { Discipline } from '../../disciplines/domain/discipline';
import { InMemorySlotRepository } from './testing/in-memory-slot.repository';
import { OpenSlot } from './use-cases/open-slot';
import { RegisterVolunteer } from './use-cases/register-volunteer';

const awa = { name: 'Awa Diop', email: 'awa@example.org' };
const moussa = { name: 'Moussa Fall', email: 'moussa@example.org' };

async function setup() {
  const disciplines = new InMemoryDisciplineRepository();
  const slots = new InMemorySlotRepository();
  const lutte = Discipline.create({
    id: randomUUID(),
    name: 'Lutte',
    category: 'sports-de-combat',
    now: new Date(),
  });
  await disciplines.insert(lutte);
  const slotInput = {
    disciplineId: lutte.id,
    startsAt: '2026-11-01T09:00:00.000Z',
    endsAt: '2026-11-01T12:00:00.000Z',
    capacity: 2,
  };
  return {
    slots,
    slotInput,
    openSlot: new OpenSlot(new GetDiscipline(disciplines), slots),
    registerVolunteer: new RegisterVolunteer(slots),
  };
}

describe('volunteers (application layer)', () => {
  it('001-AS1: opens a slot for an existing discipline and saves it', async () => {
    const { openSlot, slotInput, slots } = await setup();

    const slot = await openSlot.execute(slotInput);

    expect(slot.disciplineId).toBe(slotInput.disciplineId);
    expect(slot.startsAt).toEqual(new Date(slotInput.startsAt));
    expect(slot.endsAt).toEqual(new Date(slotInput.endsAt));
    expect(slot.remainingPlaces).toBe(2);
    expect(slots.savedSlots()).toEqual([slot]);
  });

  it('001-AS2: refuses a slot for an unknown discipline, and saves nothing', async () => {
    const { openSlot, slotInput, slots } = await setup();

    await expect(
      openSlot.execute({ ...slotInput, disciplineId: randomUUID() }),
    ).rejects.toMatchObject({ code: 'DISCIPLINE_NOT_FOUND' });
    expect(slots.savedSlots()).toEqual([]);
  });

  it.each([0, -1, 1.5])(
    '001-AS3: refuses an invalid capacity of %d, and saves nothing',
    async (capacity) => {
      const { openSlot, slotInput, slots } = await setup();

      await expect(openSlot.execute({ ...slotInput, capacity })).rejects.toMatchObject({
        code: 'SLOT_CAPACITY_INVALID',
      });
      expect(slots.savedSlots()).toEqual([]);
    },
  );

  it.each(['2026-11-01T08:00:00.000Z', '2026-11-01T09:00:00.000Z'])(
    '001-AS4: refuses an end at %s, not after the start, and saves nothing',
    async (endsAt) => {
      const { openSlot, slotInput, slots } = await setup();

      await expect(openSlot.execute({ ...slotInput, endsAt })).rejects.toMatchObject({
        code: 'SLOT_END_NOT_AFTER_START',
      });
      expect(slots.savedSlots()).toEqual([]);
    },
  );

  it('001-AS5: registers a volunteer and leaves one place', async () => {
    const { openSlot, registerVolunteer, slotInput, slots } = await setup();
    const slot = await openSlot.execute(slotInput);

    const { registration, remainingPlaces } = await registerVolunteer.execute(slot.id, awa);

    expect(registration).toMatchObject({ slotId: slot.id, ...awa });
    expect(remainingPlaces).toBe(1);
    expect(slots.savedRegistrations()).toEqual([registration]);
  });

  it('001-AS7: refuses a third volunteer on a slot of capacity 2', async () => {
    const { openSlot, registerVolunteer, slotInput, slots } = await setup();
    const slot = await openSlot.execute(slotInput);
    await registerVolunteer.execute(slot.id, awa);
    await registerVolunteer.execute(slot.id, moussa);

    await expect(
      registerVolunteer.execute(slot.id, { name: 'Fatou Sow', email: 'fatou@example.org' }),
    ).rejects.toMatchObject({ code: 'SLOT_FULL' });
    expect(slots.savedRegistrations()).toHaveLength(2);
  });

  it('001-AS9: refuses a registration on an unknown slot, and saves nothing', async () => {
    const { registerVolunteer, slots } = await setup();

    await expect(registerVolunteer.execute(randomUUID(), awa)).rejects.toMatchObject({
      code: 'SLOT_NOT_FOUND',
    });
    expect(slots.savedRegistrations()).toEqual([]);
  });

  it('001-AS10: refuses an invalid registration, and keeps the place free', async () => {
    const { openSlot, registerVolunteer, slotInput, slots } = await setup();
    const slot = await openSlot.execute(slotInput);

    await expect(
      registerVolunteer.execute(slot.id, { ...awa, email: 'awa' }),
    ).rejects.toMatchObject({ code: 'VOLUNTEER_EMAIL_INVALID' });

    expect(slots.savedRegistrations()).toEqual([]);
    expect(slots.savedSlots()[0]?.remainingPlaces).toBe(2);
  });
});
