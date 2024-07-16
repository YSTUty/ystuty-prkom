import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { PrKomController } from './prkom.controller';
import { PrKomWebProvider } from './prkom-web.provider';
import { PrKomService } from './prkom.service';

@Module({
  imports: [HttpModule.register({})],
})
export class PrKomModule {
  static register() {
    return {
      module: PrKomModule,
      controllers: [PrKomController],
      providers: [PrKomService, PrKomWebProvider],
      exports: [PrKomService],
    };
  }
}
