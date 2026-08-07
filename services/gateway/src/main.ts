import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Gateway');

  // CORS for frontend + cross-service calls
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PATCH,DELETE',
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  await app.listen(3000);
  logger.log('Gateway service running on port 3000');
}

bootstrap();
