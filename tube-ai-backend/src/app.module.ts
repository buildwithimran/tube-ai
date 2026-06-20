import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import configuration, { AppConfig } from './config/configuration';
import { validationSchema } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsageModule } from './modules/usage/usage.module';
import { PlansModule } from './modules/plans/plans.module';
import { YoutubeModule } from './modules/youtube/youtube.module';
import { AiGenerationModule } from './modules/ai/ai-generation.module';
import { LibraryModule } from './modules/library/library.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AdminModule } from './modules/admin/admin.module';
import { MailModule } from './modules/mail/mail.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ReviewModule } from './modules/review/review.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema,
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        // Never log secrets.
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('mongoUri', { infer: true }),
        retryWrites: true,
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = config.get('redis', { infer: true });
        // A full REDIS_URL (e.g. cloud/Upstash) wins; otherwise use host/port.
        let opts = {
          host: redis.host,
          port: redis.port,
          username: redis.username,
          password: redis.password,
          tls: redis.tls ? {} : undefined,
        };
        if (redis.url) {
          const u = new URL(redis.url);
          opts = {
            host: u.hostname,
            port: Number(u.port || 6379),
            username: u.username || undefined,
            password: u.password || undefined,
            tls: u.protocol === 'rediss:' ? {} : undefined,
          };
        }
        // BullMQ requires maxRetriesPerRequest: null on its connection.
        return { connection: { ...opts, maxRetriesPerRequest: null } };
      },
    }),

    HealthModule,
    UsersModule,
    AuthModule,
    UsageModule,
    PlansModule,
    YoutubeModule,
    AiGenerationModule,
    LibraryModule,
    NotificationsModule,
    FeedbackModule,
    AdminModule,
    MailModule,
    CoursesModule,
    ReviewModule,
  ],
  providers: [
    // Order matters: authenticate (Jwt) → authorize (Roles) → throttle.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
