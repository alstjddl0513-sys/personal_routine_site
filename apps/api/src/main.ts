import './bootstrap-env';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return ['http://localhost:3000'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: parseOrigins(config.get<string>('CORS_ALLOWED_ORIGIN')),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Render (and most PaaS) inject PORT; fall back to API_PORT for local dev.
  const port =
    config.get<number>('PORT') ?? config.get<number>('API_PORT') ?? 3001;
  await app.listen(port);
}
void bootstrap();
