import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // pino as the app logger (structured, fast, prod-ready).
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('port', { infer: true });
  // const corsOrigins = config.get('corsOrigins', { infer: true });

  // --- Security headers (HSTS, frameguard, noSniff, etc.) -------------------
  app.use(
    helmet({
      // Allow cross-origin resource loads (thumbnails) but keep the rest strict.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  // --- Cookies (httpOnly access + refresh tokens — see §47) -----------------
  app.use(cookieParser());

  // --- CORS with credentials (cookies travel cross-site) --------------------
  // `origin: true` reflects whatever Origin the request came from, which allows
  // ALL origins while staying compatible with credentials (cookies). A literal
  // '*' is rejected by browsers when credentials:true, so we must reflect.
  // TODO: lock this down to `config.get('corsOrigins')` before production.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
  });

  // --- URI versioning: /api/v1/... ------------------------------------------
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // --- Global validation: whitelist blocks mass-assignment ------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // --- One global error shape (AllExceptionsFilter) -------------------------
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableShutdownHooks(); // graceful Mongo/Redis/queue teardown

  await app.listen(port);
  app.get(Logger).log(`TubeAi API listening on http://localhost:${port}/api/v1`);
}
void bootstrap();
