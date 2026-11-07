import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { DisciplinesModule } from './modules/disciplines/disciplines.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';

@Module({
  imports: [CoreModule, DisciplinesModule, VolunteersModule],
})
export class AppModule {}
