import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Octop entry configuration', () => {
  it.each([
    'https://octop.example.test/',
    '/octop/',
  ])('accepts an ordinary entry: %s', async (entry) => {
    vi.stubEnv('OCTOP_BASE_URL', entry);
    vi.resetModules();
    expect((await import('./externalApps')).OCTOP_BASE_URL).toBe(entry);
  });

  it.each([
    'javascript:alert(1)',
    'https://user:secret@octop.example.test/',
  ])('rejects an unsafe entry at the configuration boundary: %s', async (entry) => {
    vi.stubEnv('OCTOP_BASE_URL', entry);
    vi.resetModules();
    await expect(import('./externalApps')).rejects.toThrow('OCTOP_BASE_URL');
  });
});
