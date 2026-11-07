import { isStorableText, VOLUNTEER_NAME_MAX_LENGTH, volunteerEmailSchema } from '@joj/shared';
import { VolunteerError } from './volunteers.errors';

export interface RegistrationProps {
  id: string;
  slotId: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface NewRegistration {
  id: string;
  slotId: string;
  /** Vérifiés ici : le domaine ne fait pas confiance à la validation HTTP. */
  name: string;
  email: string;
  now: Date;
}

/** L'inscription d'un bénévole sur un créneau : un nom non vide et un email bien formé. */
export class Registration {
  private constructor(private readonly props: RegistrationProps) {}

  static create({ id, slotId, name, email, now }: NewRegistration): Registration {
    return new Registration({
      id,
      slotId,
      name: validName(name),
      email: validEmail(email),
      createdAt: now,
    });
  }

  /** Reconstruit une inscription depuis la persistance, sans rejouer les règles de création. */
  static restore(props: RegistrationProps): Registration {
    return new Registration({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get slotId(): string {
    return this.props.slotId;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

function validName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new VolunteerError('VOLUNTEER_NAME_REQUIRED', 'A volunteer needs a name');
  }
  if (trimmed.length > VOLUNTEER_NAME_MAX_LENGTH) {
    throw new VolunteerError(
      'VOLUNTEER_NAME_TOO_LONG',
      `A volunteer name has at most ${VOLUNTEER_NAME_MAX_LENGTH} characters`,
    );
  }
  if (!isStorableText(trimmed)) {
    throw new VolunteerError(
      'VOLUNTEER_NAME_INVALID',
      'A volunteer name has a forbidden character',
    );
  }
  return trimmed;
}

function validEmail(email: string): string {
  if (!volunteerEmailSchema.safeParse(email).success) {
    throw new VolunteerError('VOLUNTEER_EMAIL_INVALID', `Invalid email ${email}`, { email });
  }
  return email;
}
