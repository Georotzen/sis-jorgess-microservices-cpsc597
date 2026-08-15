import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Gateway');

  // CORS configuration — allow specific origins when credentials are needed
  // In development, allow localhost:3000 (Next.js dev server)
  // In production, load from environment variable
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,POST,PATCH,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
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
  // app.setGlobalPrefix('api');

  await app.listen(3000);
  logger.log('Gateway service running on port 3000');

}

bootstrap();
