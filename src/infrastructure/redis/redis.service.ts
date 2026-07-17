import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

import { AllConfigType } from '@common/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private subscriber!: Redis;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  onModuleInit(): void {
    const options = this.buildOptions();
    this.client = new Redis(options);
    this.subscriber = new Redis(options);

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err: Error) => this.logger.error({ err }, 'Redis error'));
    this.client.on('reconnecting', () => this.logger.warn('Redis reconnecting...'));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.client?.quit(), this.subscriber?.quit()]);
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    return this.client.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    return this.client.exists(...keys);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  async increment(key: string, by = 1): Promise<number> {
    if (by === 1) {
      return this.client.incr(key);
    }
    return this.client.incrby(key, by);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async subscribe(
    channel: string,
    handler: (message: string, channelName: string) => void,
  ): Promise<void> {
    // Caller should subscribe once per channel; each call adds another message listener.
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch: string, message: string) => {
      if (ch === channel) {
        handler(message, ch);
      }
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  private buildOptions(): RedisOptions {
    const redis = this.configService.get('redis', { infer: true });

    return {
      host: redis?.host,
      port: redis?.port,
      password: redis?.password || undefined,
      db: redis?.db,
      keyPrefix: redis?.keyPrefix,
      lazyConnect: false,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
      reconnectOnError: (err: Error) => this.shouldReconnectOnError(err),
    };
  }

  private shouldReconnectOnError(err: Error): boolean {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some((target) => err.message.includes(target));
  }
}
