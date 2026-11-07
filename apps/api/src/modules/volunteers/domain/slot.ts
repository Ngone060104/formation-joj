import { SLOT_CAPACITY_MIN } from '@joj/shared';
import { slotFull, VolunteerError } from './volunteers.errors';

export interface SlotProps {
  id: string;
  disciplineId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  takenPlaces: number;
  createdAt: Date;
}

export interface NewSlot {
  id: string;
  disciplineId: string;
  startsAt: Date;
  endsAt: Date;
  /** Vérifiée ici : le domaine ne fait pas confiance à la validation HTTP. */
  capacity: number;
  now: Date;
}

/** Un créneau d'une discipline : il n'accepte jamais d'inscription au-delà de sa capacité. */
export class Slot {
  private constructor(private props: SlotProps) {}

  static create({ id, disciplineId, startsAt, endsAt, capacity, now }: NewSlot): Slot {
    if (!Number.isInteger(capacity) || capacity < SLOT_CAPACITY_MIN) {
      throw new VolunteerError(
        'SLOT_CAPACITY_INVALID',
        `A slot capacity is an integer of at least ${SLOT_CAPACITY_MIN}`,
        { capacity },
      );
    }
    if (endsAt <= startsAt) {
      throw new VolunteerError('SLOT_END_NOT_AFTER_START', 'A slot must end after it starts');
    }
    return new Slot({
      id,
      disciplineId,
      startsAt,
      endsAt,
      capacity,
      takenPlaces: 0,
      createdAt: now,
    });
  }

  /** Reconstruit un créneau depuis la persistance, sans rejouer les règles de création. */
  static restore(props: SlotProps): Slot {
    return new Slot({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get disciplineId(): string {
    return this.props.disciplineId;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get endsAt(): Date {
    return this.props.endsAt;
  }

  get capacity(): number {
    return this.props.capacity;
  }

  get takenPlaces(): number {
    return this.props.takenPlaces;
  }

  get remainingPlaces(): number {
    return this.props.capacity - this.props.takenPlaces;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** La règle centrale du produit : lève SLOT_FULL quand il ne reste aucune place. */
  takePlace(): void {
    if (this.remainingPlaces <= 0) throw slotFull(this.id);
    this.props = { ...this.props, takenPlaces: this.props.takenPlaces + 1 };
  }
}
