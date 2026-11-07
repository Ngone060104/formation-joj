import { Slot } from '../domain/slot';
import type { SlotRow } from './volunteers.schema';

/** Ligne de la table → entité. */
export function toDomain(row: SlotRow): Slot {
  return Slot.restore({
    id: row.id,
    disciplineId: row.disciplineId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    capacity: row.capacity,
    takenPlaces: row.takenPlaces,
    createdAt: row.createdAt,
  });
}

/** Entité → ligne de la table. */
export function toRow(slot: Slot): SlotRow {
  return {
    id: slot.id,
    disciplineId: slot.disciplineId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    takenPlaces: slot.takenPlaces,
    createdAt: slot.createdAt,
  };
}
