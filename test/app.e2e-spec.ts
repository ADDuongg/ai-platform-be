import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

/**
 * Smoke e2e placeholder.
 * Full e2e requires docker-compose services (Postgres + Redis).
 */
describe('App (e2e)', () => {
  let app: INestApplication | undefined;

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('placeholder — wire AppModule when infra is available in CI', () => {
    expect(true).toBe(true);
  });
});
