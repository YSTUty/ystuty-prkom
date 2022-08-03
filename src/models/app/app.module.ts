import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrKomModule } from '../prkom/prkom.module';

@Module({
  imports: [PrKomModule.register()],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
