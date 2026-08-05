import argon2 from 'argon2';

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

const DUMMY_PASSWORD = 'invalid login password value';

export class PasswordService {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return argon2.hash(password, HASH_OPTIONS);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  async verifyLogin(hash: string | undefined, password: string): Promise<boolean> {
    if (!this.dummyHash) {
      this.dummyHash = this.hash(DUMMY_PASSWORD);
    }
    return this.verify(hash ?? (await this.dummyHash), password);
  }
}
