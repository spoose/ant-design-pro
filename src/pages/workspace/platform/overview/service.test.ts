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

  it('lets the Token determine the organization and resolves launchUrl against XOne', async () => {
    await expect(getOctopLaunchUrl()).resolves.toBe(
      'http://xone.test:18086/web/ai/octop/launch?ticket=test-ticket',
    );
    expect(requestMock).toHaveBeenCalledWith('/web/ai/octop/ticket', {
      method: 'POST',
      baseURL: '',
      skipErrorHandler: true,
    });
  });

  it('accepts an absolute launchUrl from the configured XOne origin', async () => {
    requestMock.mockResolvedValue({
      code: 200,
      data: {
        launchUrl:
          'http://xone.test:18086/web/ai/octop/launch?ticket=test-ticket',
      },
    });
    await expect(getOctopLaunchUrl()).resolves.toBe(
      'http://xone.test:18086/web/ai/octop/launch?ticket=test-ticket',
    );
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

  it('preserves 602001 so the caller can prompt for an organization', async () => {
    requestMock.mockResolvedValue({
      code: 602001,
      msg: '未选择组织',
      data: null,
    });
    await expect(getOctopLaunchUrl()).rejects.toMatchObject({
      name: 'XoneAuthBackendError',
      code: 602001,
    });
  });

  it.each([
    null,
    {},
    { launchUrl: '' },
    { launchUrl: 123 },
  ])('rejects missing launch data: %j', async (data) => {
    requestMock.mockResolvedValue({ code: 200, data });
    await expect(getOctopLaunchUrl()).rejects.toThrow('免登票据响应不完整');
  });

  it.each([
    'https://other.test/web/ai/octop/launch?ticket=test-ticket',
    '//other.test/web/ai/octop/launch?ticket=test-ticket',
    'javascript:alert(1)',
    'http://user:password@xone.test:18086/web/ai/octop/launch?ticket=test-ticket',
  ])('rejects an unexpected launch destination: %s', async (launchUrl) => {
    requestMock.mockResolvedValue({
      ...ticketResponse,
      data: { ...ticketResponse.data, launchUrl },
    });
    await expect(getOctopLaunchUrl()).rejects.toThrow('免登跳转地址无效');
  });

  it('does not trust an absolute backend URL when its public origin is not configured', async () => {
    config.XONE_PUBLIC_BASE_URL = '';
    requestMock.mockResolvedValue({
      code: 200,
      data: {
        launchUrl:
          'http://xone.test:18086/web/ai/octop/launch?ticket=test-ticket',
      },
    });
    await expect(getOctopLaunchUrl()).rejects.toThrow('免登跳转地址无效');
  });
});
