import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';
import * as swStats from 'swagger-stats';
import * as compression from 'compression';
import * as cors from 'cors';
import { AppModule } from './models/app/app.module';

import * as xEnv from '@my-environment';
import { HttpExceptionFilter, ValidationHttpPipe } from '@my-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(compression());
  app.use(cors());

  app.useGlobalPipes(new ValidationHttpPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  if (xEnv.SWAGGER_ACCESS_USERNAME) {
    app.use(
      ['/swagger', '/swagger-json', '/swagger-stats'],
      basicAuth({
        challenge: true,
        users: {
          [xEnv.SWAGGER_ACCESS_USERNAME]: xEnv.SWAGGER_ACCESS_PASSWORD,
        },
      }),
    );
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${xEnv.APP_NAME} API`)
    .setDescription('This documentation describes the YSTUty Prkom Parser API.')
    .setVersion(process.env.npm_package_version)
    .addTag('ystu')
    .build();
  const swaggerSpec = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, swaggerSpec, {});

  app.use(swStats.getMiddleware({ swaggerSpec }));

  await app.listen(xEnv.SERVER_PORT);

  Logger.log(`🚀 Server is listening on port ${xEnv.SERVER_PORT}`, 'Bootstrap');
  Logger.log(`Server API Token: ${xEnv.SERVER_API_ACCESS_TOKEN}`, 'Bootstrap');
}
bootstrap().catch((e) => {
  Logger.warn(`❌  Error starting server, ${e}`, 'Bootstrap');
  throw e;
});
