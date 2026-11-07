import { z } from 'zod';

export const SLOT_CAPACITY_MIN = 1;
export const VOLUNTEER_NAME_MAX_LENGTH = 100;

/** Une date que la base sait stocker : Postgres refuse l'an 0000, avec une erreur 500 sinon. */
const slotDateSchema = z.iso.datetime().refine((value) => new Date(value).getUTCFullYear() >= 1, {
  message: 'The date is too far in the past',
});

/** Corps de `POST /api/slots`. Le domaine revérifie la capacité et l'ordre des dates. */
export const createSlotSchema = z
  .object({
    disciplineId: z.uuid(),
    startsAt: slotDateSchema,
    endsAt: slotDateSchema,
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

/** Faux pour un texte que Postgres ne peut pas stocker : il refuse le caractère NUL. */
export const isStorableText = (text: string): boolean => !text.includes(String.fromCharCode(0));

/** Corps de `POST /api/slots/:id/registrations`. */
export const createRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(VOLUNTEER_NAME_MAX_LENGTH)
    .refine(isStorableText, { message: 'The name contains a forbidden character' }),
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
