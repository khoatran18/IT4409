import {
  Global,
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../config/config.service';

export const REDIS = Symbol('REDIS');

@Injectable()
class RedisShutdown implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.env.REDIS_URL, { maxRetriesPerRequest: 2 }),
    },
    RedisShutdown,
  ],
  exports: [REDIS],
})
export class RedisModule {}
