import { describe, expect, it } from 'vitest';
import { PasswordService } from '../src/services/passwordService.js';

describe('PasswordService', () => {
  it('stores an Argon2id hash and verifies the original password', async () => {
    const service = new PasswordService();
    const password = 'correct horse battery staple';
    const hash = await service.hash(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(service.verify(hash, password)).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong password')).resolves.toBe(false);
  });
});
