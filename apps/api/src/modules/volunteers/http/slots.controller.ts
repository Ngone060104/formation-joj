import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createRegistrationSchema,
  createSlotSchema,
  type RegistrationResponse,
  registrationSchema,
  slotIdParamsSchema,
  type SlotResponse,
  slotSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { OpenSlot } from '../application/use-cases/open-slot';
import {
  RegisterVolunteer,
  type RegisteredVolunteer,
} from '../application/use-cases/register-volunteer';
import type { Slot } from '../domain/slot';

class CreateSlotDto extends createZodDto(createSlotSchema) {}
class CreateRegistrationDto extends createZodDto(createRegistrationSchema) {}
class SlotIdParamsDto extends createZodDto(slotIdParamsSchema) {}
class SlotDto extends createZodDto(slotSchema) {}
class RegistrationDto extends createZodDto(registrationSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('slots')
@Controller('slots')
export class SlotsController {
  constructor(
    private readonly openSlot: OpenSlot,
    private readonly registerVolunteer: RegisterVolunteer,
  ) {}

  @Post()
  @ZodSerializerDto(SlotDto)
  async create(@Body() body: CreateSlotDto): Promise<SlotResponse> {
    return toSlotResponse(await this.openSlot.execute(body));
  }

  @Post(':id/registrations')
  @ZodSerializerDto(RegistrationDto)
  async register(
    @Param() { id }: SlotIdParamsDto,
    @Body() body: CreateRegistrationDto,
  ): Promise<RegistrationResponse> {
    return toRegistrationResponse(await this.registerVolunteer.execute(id, body));
  }
}

function toSlotResponse(slot: Slot): SlotResponse {
  return {
    id: slot.id,
    disciplineId: slot.disciplineId,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    capacity: slot.capacity,
    remainingPlaces: slot.remainingPlaces,
    createdAt: slot.createdAt.toISOString(),
  };
}

function toRegistrationResponse({
  registration,
  remainingPlaces,
}: RegisteredVolunteer): RegistrationResponse {
  return {
    id: registration.id,
    slotId: registration.slotId,
    name: registration.name,
    email: registration.email,
    remainingPlaces,
    createdAt: registration.createdAt.toISOString(),
  };
}
