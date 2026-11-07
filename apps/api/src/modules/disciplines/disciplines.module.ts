import { Module } from '@nestjs/common';
import { DisciplineRepository } from './application/discipline.repository';
import { CreateDiscipline } from './application/use-cases/create-discipline';
import { DeleteDiscipline } from './application/use-cases/delete-discipline';
import { GetDiscipline } from './application/use-cases/get-discipline';
import { ListDisciplines } from './application/use-cases/list-disciplines';
import { UpdateDiscipline } from './application/use-cases/update-discipline';
import { DisciplinesController } from './http/disciplines.controller';
import { DrizzleDisciplineRepository } from './infra/drizzle-discipline.repository';

@Module({
  controllers: [DisciplinesController],
  providers: [
    // Le port (classe abstraite) est relié ici à son implémentation Drizzle.
    { provide: DisciplineRepository, useClass: DrizzleDisciplineRepository },
    CreateDiscipline,
    ListDisciplines,
    GetDiscipline,
    UpdateDiscipline,
    DeleteDiscipline,
  ],
  // Le module Volunteers vérifie qu'une discipline existe avant d'ouvrir un créneau.
  exports: [GetDiscipline],
})
export class DisciplinesModule {}
