import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAccessTokenLoginPath,
  handleAccessTokenFailure,
  isAccessTokenFailure,
  resetAccessTokenFailureRedirect,
} from './authFailure';
import {
  clearAuthSessionMetadata,
  getAuthSessionMetadata,
  saveAuthSessionMetadata,
} from './authSessionMetadata';
import { clearAccessToken, getAccessToken, setAccessToken } from './authToken';

describe('authFailure', () => {
  beforeEach(() => {
    clearAccessToken();
    clearAuthSessionMetadata();
    resetAccessTokenFailureRedirect();
  });

  it.each([
    'ACCESS_TOKEN_MISSING',
    'ACCESS_TOKEN_INVALID',
    'ACCESS_TOKEN_EXPIRED',
  ])('recognizes %s in both supported request error shapes', (errorCode) => {
    expect(isAccessTokenFailure({ info: { errorCode } })).toBe(true);
    expect(isAccessTokenFailure({ response: { data: { errorCode } } })).toBe(
      true,
    );
  });

  it('does not treat BAD_CREDENTIALS or an untyped 401 as Token failure', () => {
    expect(
      isAccessTokenFailure({
        response: {
          status: 401,
          data: { errorCode: 'BAD_CREDENTIALS' },
        },
      }),
    ).toBe(false);
    expect(isAccessTokenFailure({ response: { status: 401 } })).toBe(false);
  });

  it('recognizes typed XOne session failures without treating every error as auth failure', () => {
    expect(
      isAccessTokenFailure({ name: 'XoneAuthBackendError', code: 401 }),
    ).toBe(true);
    expect(isAccessTokenFailure({ name: 'XoneTokenClaimsError' })).toBe(true);
    expect(
      isAccessTokenFailure({
        response: { status: 401, data: { code: 401 } },
      }),
    ).toBe(true);
    expect(
      isAccessTokenFailure({ name: 'XoneAuthBackendError', code: 403 }),
    ).toBe(false);
  });

  it('clears the Token, preserves the return URL, and redirects only once', () => {
    const navigate = vi.fn();
    const location = {
      pathname: '/workspace/org/org-1/home',
      search: '?tab=recent',
      hash: '#result',
    };
    const error = { info: { errorCode: 'ACCESS_TOKEN_EXPIRED' } };
    setAccessToken('expired-access-token');
    saveAuthSessionMetadata({
      backend: 'legacy',
      identifier: 'expired-user',
    });

    expect(handleAccessTokenFailure(error, { location, navigate })).toBe(true);
    expect(handleAccessTokenFailure(error, { location, navigate })).toBe(true);

    expect(getAccessToken()).toBeUndefined();
    expect(getAuthSessionMetadata()).toBeUndefined();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent(
        '/workspace/org/org-1/home?tab=recent#result',
      )}`,
    );
  });

  it('avoids a redirect loop while already on the login page', () => {
    expect(
      buildAccessTokenLoginPath({
        pathname: '/user/login',
        search: '?redirect=%2Fworkspace',
        hash: '',
      }),
    ).toBe('/user/login');
  });

  it('leaves BAD_CREDENTIALS and the current Token untouched', () => {
    const navigate = vi.fn();
    setAccessToken('existing-access-token');

    expect(
      handleAccessTokenFailure(
        {
          response: {
            status: 401,
            data: { errorCode: 'BAD_CREDENTIALS' },
          },
        },
        {
          location: { pathname: '/user/login', search: '', hash: '' },
          navigate,
        },
      ),
    ).toBe(false);
    expect(getAccessToken()).toBe('existing-access-token');
    expect(navigate).not.toHaveBeenCalled();
  });
});
