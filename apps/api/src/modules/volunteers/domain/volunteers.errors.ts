import { AppError, type ErrorKind } from '../../../core/errors/app-error';

/** Codes stables exposés aux clients ; la catégorie décide du statut HTTP. */
const VOLUNTEER_ERROR_KINDS = {
  /** La capacité n'est pas un entier d'au moins 1. */
  SLOT_CAPACITY_INVALID: 'VALIDATION',
  /** La fin est avant le début, ou égale au début. */
  SLOT_END_NOT_AFTER_START: 'VALIDATION',
  /** Nom vide, ou fait seulement d'espaces. */
  VOLUNTEER_NAME_REQUIRED: 'VALIDATION',
  VOLUNTEER_NAME_TOO_LONG: 'VALIDATION',
  /** Le nom contient un caractère impossible à stocker. */
  VOLUNTEER_NAME_INVALID: 'VALIDATION',
  VOLUNTEER_EMAIL_INVALID: 'VALIDATION',
  /** Aucun créneau n'a cet identifiant. */
  SLOT_NOT_FOUND: 'NOT_FOUND',
  /** Le créneau n'a plus de place restante. */
  SLOT_FULL: 'CONFLICT',
} as const satisfies Record<string, ErrorKind>;

export type VolunteerErrorCode = keyof typeof VOLUNTEER_ERROR_KINDS;

export class VolunteerError extends AppError<VolunteerErrorCode> {
  constructor(code: VolunteerErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, VOLUNTEER_ERROR_KINDS[code], message, details);
  }
}

export function slotFull(id: string): VolunteerError {
  return new VolunteerError('SLOT_FULL', `Slot ${id} has no place left`, { id });
}

export function slotNotFound(id: string): VolunteerError {
  return new VolunteerError('SLOT_NOT_FOUND', `No slot with id ${id}`, { id });
}
