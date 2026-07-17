import { hashPassword, hashToken, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashes and verifies passwords with argon2id', async () => {
    const hash = await hashPassword('ChangeMe123!');
    expect(hash).toContain('argon2');
    await expect(verifyPassword(hash, 'ChangeMe123!')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('hashes tokens with sha256 hex digest', () => {
    const digest = hashToken('refresh-token-value');
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[a-f0-9]+$/);
    expect(hashToken('refresh-token-value')).toBe(digest);
    expect(hashToken('other')).not.toBe(digest);
  });
});
