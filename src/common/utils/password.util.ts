import * as argon2 from 'argon2';
import { createHash } from 'crypto';

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
