import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { AllConfigType } from '@common/config';
import { RedisService } from '@infrastructure/redis';

export interface HealthReport {
  status: string;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details: Record<string, unknown>;
  uptime: number;
  version: string;
  memory: {
    heapUsedMb: number;
    rssMb: number;
  };
}

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async check(): Promise<HealthReport> {
    const app = this.configService.get('app', { infer: true });
    const mem = process.memoryUsage();

    const result = await this.health.check([
      () => this.db.pingCheck('postgres'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.checkRedis(),
    ]);

    return {
      ...result,
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      version: app?.version ?? '0.0.0',
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
      },
    };
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const healthy = await this.redisService.isHealthy();
    const result: HealthIndicatorResult = {
      redis: {
        status: healthy ? 'up' : 'down',
      },
    };

    if (!healthy) {
      throw new HealthCheckError('Redis check failed', result);
    }

    return result;
  }
}
