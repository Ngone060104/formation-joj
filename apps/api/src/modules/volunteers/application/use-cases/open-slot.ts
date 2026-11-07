import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CreateSlotInput } from '@joj/shared';
import { GetDiscipline } from '../../../disciplines/application/use-cases/get-discipline';
import { Slot } from '../../domain/slot';
import { SlotRepository } from '../slot.repository';

@Injectable()
export class OpenSlot {
  constructor(
    private readonly getDiscipline: GetDiscipline,
    private readonly slots: SlotRepository,
  ) {}

  async execute(input: CreateSlotInput): Promise<Slot> {
    // Lève DISCIPLINE_NOT_FOUND : un créneau appartient toujours à une discipline existante.
    const discipline = await this.getDiscipline.execute(input.disciplineId);
    const slot = Slot.create({
      id: randomUUID(),
      disciplineId: discipline.id,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      capacity: input.capacity,
      now: new Date(),
    });
    await this.slots.insert(slot);
    return slot;
  }
}
