// Lu par drizzle-kit pour générer les migrations : ce fichier n'importe que drizzle-orm et la table
// des disciplines, cible de la clé étrangère.
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { disciplines } from '../../disciplines/infra/disciplines.schema';

export const slots = pgTable(
  'slots',
  {
    id: uuid('id').primaryKey(),
    // CASCADE : supprimer une discipline reste possible, et emporte ses créneaux.
    disciplineId: uuid('discipline_id')
      .notNull()
      .references(() => disciplines.id, { onDelete: 'cascade' }),
    // Précision milliseconde = celle de Date en JavaScript.
    startsAt: timestamp('starts_at', { withTimezone: true, precision: 3 }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, precision: 3 }).notNull(),
    capacity: integer('capacity').notNull(),
    takenPlaces: integer('taken_places').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull(),
  },
  (table) => [
    check('slots_end_after_start', sql`${table.endsAt} > ${table.startsAt}`),
    check('slots_capacity_min', sql`${table.capacity} >= 1`),
    // Dernier filet de la promesse du produit : le créneau ne déborde jamais, même sur un bug.
    check('slots_taken_places_max', sql`${table.takenPlaces} <= ${table.capacity}`),
  ],
);

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey(),
  slotId: uuid('slot_id')
    .notNull()
    .references(() => slots.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  // Pas d'unicité ici : le refus d'un email en double arrive avec TR2.
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull(),
});

export type SlotRow = typeof slots.$inferSelect;
export type RegistrationRow = typeof registrations.$inferSelect;
