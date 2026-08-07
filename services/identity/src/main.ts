import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from '@sis/shared-errors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('Identity');
  // Defense in depth: re-validate every request body here even though
  // the Gateway also validates shape before routing.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties (e.g. a client-supplied "role" field)
      forbidNonWhitelisted: true, // reject requests that include unknown fields, rather than silently drop them
      transform: true,
    }),
  );

  // Example: load env-based config (Vault/Keycloak later)
  logger.log(`Identity service starting with NODE_ENV=${process.env.NODE_ENV}`);

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}
bootstrap();
