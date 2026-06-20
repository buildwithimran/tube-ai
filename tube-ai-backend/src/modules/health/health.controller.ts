import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';

const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(@InjectConnection() private readonly mongo: Connection) {}

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      mongo: MONGO_STATES[this.mongo.readyState] ?? 'unknown',
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
