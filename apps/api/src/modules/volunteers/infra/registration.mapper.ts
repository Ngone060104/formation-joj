import { Registration } from '../domain/registration';
import type { RegistrationRow } from './volunteers.schema';

/** Ligne de la table → entité. */
export function toDomain(row: RegistrationRow): Registration {
  return Registration.restore({
    id: row.id,
    slotId: row.slotId,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
  });
}

/** Entité → ligne de la table. */
export function toRow(registration: Registration): RegistrationRow {
  return {
    id: registration.id,
    slotId: registration.slotId,
    name: registration.name,
    email: registration.email,
    createdAt: registration.createdAt,
  };
}
