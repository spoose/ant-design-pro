import { request } from '@umijs/max';
import { XONE_PUBLIC_BASE_URL } from '@/config/externalApps';
import { XoneAuthBackendError } from '@/services/auth-backends/xone';
import type { XoneResult } from '@/services/xone-api/types';

type OctopTicket = {
  ticket: string;
  octopBaseUrl: string;
  launchUrl: string;
};

export async function getOctopLaunchUrl(): Promise<string> {
  const response = await request<XoneResult<OctopTicket | null>>(
    '/web/ai/octop/ticket',
    {
      method: 'POST',
      // 覆盖生产环境的演示 API baseURL，ticket 始终走工作台的 /web 代理。
      baseURL: '',
      // shortcut: 后端目前仅组织 1 完成 Octop 配置，接入更多组织时改为按会话选择。
      data: { organizationId: 1 },
      skipErrorHandler: true,
    },
  );
  if (response.code !== 200) {
    throw new XoneAuthBackendError('获取免登票据', response);
  }
  const data = response.data;
  if (
    typeof data?.ticket !== 'string' ||
    !data.ticket ||
    typeof data.launchUrl !== 'string' ||
    !data.launchUrl
  ) {
    throw new Error('免登票据响应不完整');
  }

  // launch 属于 XOne；拼接 octopBaseUrl 会把交接请求送到错误服务。
  const base = new URL(XONE_PUBLIC_BASE_URL || window.location.origin);
  const launchUrl = new URL(data.launchUrl, base);
  if (
    !['http:', 'https:'].includes(launchUrl.protocol) ||
    launchUrl.origin !== base.origin ||
    launchUrl.username ||
    launchUrl.password ||
    launchUrl.hash ||
    launchUrl.pathname !== '/web/ai/octop/launch' ||
    launchUrl.searchParams.get('ticket') !== data.ticket
  ) {
    throw new Error('免登跳转地址无效');
  }
  return launchUrl.href;
}
