import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './models/app/app.module';

import * as xEnv from '@my-environment';
import { HttpExceptionFilter, ValidationHttpPipe } from '@my-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationHttpPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  await app.listen(xEnv.SERVER_PORT);

  Logger.log(`🚀 Server is listening on port ${xEnv.SERVER_PORT}`, 'Bootstrap');
}
bootstrap().catch((e) => {
  Logger.warn(`❌  Error starting server, ${e}`, 'Bootstrap');
  throw e;
});
