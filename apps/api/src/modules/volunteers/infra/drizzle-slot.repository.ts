import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { SlotRepository } from '../application/slot.repository';
import type { Registration } from '../domain/registration';
import type { Slot } from '../domain/slot';
import { slotNotFound } from '../domain/volunteers.errors';
import { toRow as toRegistrationRow } from './registration.mapper';
import { toDomain, toRow } from './slot.mapper';
import { registrations, slots } from './volunteers.schema';

@Injectable()
export class DrizzleSlotRepository extends SlotRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async insert(slot: Slot): Promise<void> {
    await this.db.insert(slots).values(toRow(slot));
  }

  async addRegistration(registration: Registration): Promise<Slot> {
    return this.db.transaction(async (tx) => {
      // Le verrou fait attendre une inscription simultanée, qui verra ensuite le créneau à jour.
      const [row] = await tx
        .select()
        .from(slots)
        .where(eq(slots.id, registration.slotId))
        .for('update');
      if (!row) throw slotNotFound(registration.slotId);

      const slot = toDomain(row);
      slot.takePlace();
      await tx.insert(registrations).values(toRegistrationRow(registration));
      await tx.update(slots).set({ takenPlaces: slot.takenPlaces }).where(eq(slots.id, slot.id));
      return slot;
    });
  }
}
