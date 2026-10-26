import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOctopLaunchUrl } from './service';

const { requestMock, config } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  config: { XONE_PUBLIC_BASE_URL: 'http://xone.test:18086' },
}));

vi.mock('@umijs/max', () => ({ request: requestMock }));
vi.mock('@/config/externalApps', () => config);

const ticketResponse = {
  code: 200,
  msg: '操作成功',
  data: {
    ticket: 'test-ticket',
    octopBaseUrl: 'http://octop.test:9000',
    launchUrl: '/web/ai/octop/launch?ticket=test-ticket',
  },
};

describe('Octop handoff', () => {
  beforeEach(() => {
    requestMock.mockReset();
    config.XONE_PUBLIC_BASE_URL = 'http://xone.test:18086';
    requestMock.mockResolvedValue(ticketResponse);
  });

  it('requests organization 1 and resolves launchUrl against XOne, not Octop', async () => {
    await expect(getOctopLaunchUrl()).resolves.toBe(
      'http://xone.test:18086/web/ai/octop/launch?ticket=test-ticket',
    );
    expect(requestMock).toHaveBeenCalledWith('/web/ai/octop/ticket', {
      method: 'POST',
      baseURL: '',
      data: { organizationId: 1 },
      skipErrorHandler: true,
    });
  });

  it('uses the current origin when XOne is served through the same public gateway', async () => {
    config.XONE_PUBLIC_BASE_URL = '';
    await expect(getOctopLaunchUrl()).resolves.toBe(
      `${window.location.origin}/web/ai/octop/launch?ticket=test-ticket`,
    );
  });

  it('rejects business failures even when HTTP succeeds', async () => {
    requestMock.mockResolvedValue({ code: 403, msg: '组织未接入', data: null });
    await expect(getOctopLaunchUrl()).rejects.toThrow('组织未接入');
  });

  it('preserves XOne 401 errors for the shared session failure handler', async () => {
    requestMock.mockResolvedValue({ code: 401, msg: '登录已失效', data: null });
    await expect(getOctopLaunchUrl()).rejects.toMatchObject({
      name: 'XoneAuthBackendError',
      code: 401,
    });
  });

  it.each([
    null,
    {},
    { ticket: 'test-ticket' },
    { ticket: '', launchUrl: '/web/ai/octop/launch?ticket=' },
  ])('rejects incomplete ticket data: %j', async (data) => {
    requestMock.mockResolvedValue({ code: 200, data });
    await expect(getOctopLaunchUrl()).rejects.toThrow('免登票据响应不完整');
  });

  it.each([
    'https://other.test/web/ai/octop/launch?ticket=test-ticket',
    '//other.test/web/ai/octop/launch?ticket=test-ticket',
    'javascript:alert(1)',
    '/user/login?ticket=test-ticket',
    '/web/ai/octop/launch?ticket=different-ticket',
    'http://user:password@xone.test:18086/web/ai/octop/launch?ticket=test-ticket',
  ])('rejects an unexpected launch destination: %s', async (launchUrl) => {
    requestMock.mockResolvedValue({
      ...ticketResponse,
      data: { ...ticketResponse.data, launchUrl },
    });
    await expect(getOctopLaunchUrl()).rejects.toThrow('免登跳转地址无效');
  });
});
