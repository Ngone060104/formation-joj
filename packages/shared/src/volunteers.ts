import { z } from 'zod';

export const SLOT_CAPACITY_MIN = 1;
export const VOLUNTEER_NAME_MAX_LENGTH = 100;

/** Corps de `POST /api/slots`. Le domaine revérifie la capacité et l'ordre des dates. */
export const createSlotSchema = z
  .object({
    disciplineId: z.uuid(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    // 32 bits : au-delà, la colonne `capacity` refuserait la valeur avec une erreur 500.
    capacity: z.int32().min(SLOT_CAPACITY_MIN),
  })
  .refine((input) => new Date(input.endsAt) > new Date(input.startsAt), {
    message: 'The end must be after the start',
    path: ['endsAt'],
  });
export type CreateSlotInput = z.infer<typeof createSlotSchema>;

/** Paramètre `:id` des routes d'un créneau. */
export const slotIdParamsSchema = z.object({ id: z.uuid() });

/** Un créneau tel que l'API le renvoie. */
export const slotSchema = z.object({
  id: z.uuid(),
  disciplineId: z.uuid(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  capacity: z.int().min(SLOT_CAPACITY_MIN),
  remainingPlaces: z.int().min(0),
  createdAt: z.iso.datetime(),
});
export type SlotResponse = z.infer<typeof slotSchema>;

/** Partagé avec le domaine : l'API et l'entité appliquent la même règle. */
export const volunteerEmailSchema = z.email();

/** Corps de `POST /api/slots/:id/registrations`. */
export const createRegistrationSchema = z.object({
  name: z.string().trim().min(1).max(VOLUNTEER_NAME_MAX_LENGTH),
  email: volunteerEmailSchema,
});
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;

/** Une inscription telle que l'API la renvoie, avec les places restantes sur le créneau. */
export const registrationSchema = z.object({
  id: z.uuid(),
  slotId: z.uuid(),
  name: z.string(),
  email: volunteerEmailSchema,
  remainingPlaces: z.int().min(0),
  createdAt: z.iso.datetime(),
});
export type RegistrationResponse = z.infer<typeof registrationSchema>;
