import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { PrKomController } from './prkom.controller';
import { PrKomProvider } from './prkom.provider';
import { PrKomService } from './prkom.service';

@Module({
  imports: [HttpModule.register({})],
})
export class PrKomModule {
  static register() {
    return {
      module: PrKomModule,
      controllers: [PrKomController],
      providers: [PrKomService, PrKomProvider],
      exports: [PrKomService],
    };
  }
}
