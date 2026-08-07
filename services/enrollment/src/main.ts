import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from '@sis/shared-errors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

const logger = new Logger('Enrollment');

  // Defense in depth: re-validate every request body here even though
  // the Gateway also validates shape before routing. Same config as
  // every other service.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  logger.log('Enrollment service running on port 3005');
}
bootstrap();
