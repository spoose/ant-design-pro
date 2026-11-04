import { beforeEach, describe, expect, it, vi } from 'vitest';
import { destroyOctopInstance, getOctopInstanceName } from './octopRuntime';

const destroyApp = vi.hoisted(() => vi.fn<(name: string) => Promise<void>>());
vi.mock('wujie-react', () => ({ default: { destroyApp } }));

beforeEach(() => destroyApp.mockReset().mockResolvedValue(undefined));

describe('Octop runtime boundary', () => {
  it('keeps the existing user and scope naming with encoded identifiers', () => {
    expect(
      getOctopInstanceName('user:1', {
        kind: 'organization',
        organizationId: 'org/1',
      }),
    ).toBe('octop:user%3A1:organization:org%2F1');
    expect(getOctopInstanceName('user-1', { kind: 'platform' })).toBe(
      'octop:user-1:platform',
    );
    expect(getOctopInstanceName(undefined, undefined)).toBe(
      'octop:anonymous:platform',
    );
  });

  it('destroys exactly the instance identified by the shared name', async () => {
    const name = getOctopInstanceName('user-1', { kind: 'platform' });
    await destroyOctopInstance(name);
    expect(destroyApp).toHaveBeenCalledExactlyOnceWith(name);
  });

  it('propagates framework cleanup failures to the caller', async () => {
    const error = new Error('Cleanup failed');
    destroyApp.mockRejectedValueOnce(error);
    await expect(destroyOctopInstance('octop:user-1:platform')).rejects.toBe(
      error,
    );
  });
});
