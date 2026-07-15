import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from './authToken';

describe('authToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it('stores an access token in localStorage', () => {
    setAccessToken('access-token');

    expect(getAccessToken()).toBe('access-token');
    expect(localStorage.getItem('ant-design-pro.access-token')).toBe(
      'access-token',
    );
  });

  it('clears the access token', () => {
    setAccessToken('access-token');

    clearAccessToken();

    expect(getAccessToken()).toBeUndefined();
  });

  it('allows replacing the access token', () => {
    setAccessToken('old-token');
    setAccessToken('new-token');

    expect(getAccessToken()).toBe('new-token');
  });

  it('removes the stored token when setting an empty value', () => {
    setAccessToken('access-token');

    setAccessToken();

    expect(getAccessToken()).toBeUndefined();
  });

  it('does not access browser storage during server-side execution', () => {
    vi.stubGlobal('window', undefined);

    expect(getAccessToken()).toBeUndefined();
    expect(() => setAccessToken('access-token')).not.toThrow();
    expect(() => clearAccessToken()).not.toThrow();
  });
});
