import type { Registration } from '../../domain/registration';
import { Slot } from '../../domain/slot';
import { slotNotFound } from '../../domain/volunteers.errors';
import { SlotRepository } from '../slot.repository';

/** Fake fidèle au contrat du port (place prise avant l'inscription), pour tester sans base. */
export class InMemorySlotRepository extends SlotRepository {
  private readonly slots = new Map<string, Slot>();
  private readonly registrations: Registration[] = [];

  async insert(slot: Slot): Promise<void> {
    this.slots.set(slot.id, clone(slot));
  }

  async addRegistration(registration: Registration): Promise<Slot> {
    const found = this.slots.get(registration.slotId);
    if (!found) throw slotNotFound(registration.slotId);
    const slot = clone(found);
    slot.takePlace();
    this.slots.set(slot.id, slot);
    this.registrations.push(registration);
    return clone(slot);
  }

  /** Lecture réservée aux tests : le port n'a pas besoin de relire un créneau. */
  savedSlots(): Slot[] {
    return [...this.slots.values()].map(clone);
  }

  /** Lecture réservée aux tests : le port n'a pas besoin de relire une inscription. */
  savedRegistrations(): Registration[] {
    return [...this.registrations];
  }
}

/** Copie : un test ne voit pas une modification qui n'a pas été persistée. */
function clone(slot: Slot): Slot {
  return Slot.restore({
    id: slot.id,
    disciplineId: slot.disciplineId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    takenPlaces: slot.takenPlaces,
    createdAt: slot.createdAt,
  });
}
