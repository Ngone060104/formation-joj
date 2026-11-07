import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CreateRegistrationInput } from '@joj/shared';
import { Registration } from '../../domain/registration';
import { SlotRepository } from '../slot.repository';

export interface RegisteredVolunteer {
  registration: Registration;
  remainingPlaces: number;
}

@Injectable()
export class RegisterVolunteer {
  constructor(private readonly slots: SlotRepository) {}

  async execute(slotId: string, input: CreateRegistrationInput): Promise<RegisteredVolunteer> {
    const registration = Registration.create({
      id: randomUUID(),
      slotId,
      name: input.name,
      email: input.email,
      now: new Date(),
    });
    // La capacité se vérifie dans le repository, sous verrou : une lecture ici arriverait trop tôt.
    const slot = await this.slots.addRegistration(registration);
    return { registration, remainingPlaces: slot.remainingPlaces };
  }
}
