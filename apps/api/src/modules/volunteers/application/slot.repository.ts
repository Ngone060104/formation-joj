import type { Registration } from '../domain/registration';
import type { Slot } from '../domain/slot';

/**
 * Port de persistance : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzleSlotRepository (infra) et InMemorySlotRepository (tests).
 */
export abstract class SlotRepository {
  abstract insert(slot: Slot): Promise<void>;
  /**
   * Prend une place et enregistre l'inscription d'un seul bloc, même si deux inscriptions arrivent
   * en même temps. Renvoie le créneau à jour ; lève SLOT_NOT_FOUND ou SLOT_FULL.
   */
  abstract addRegistration(registration: Registration): Promise<Slot>;
}
