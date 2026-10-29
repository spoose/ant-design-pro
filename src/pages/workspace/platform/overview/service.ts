import { request } from '@umijs/max';
import { XONE_PUBLIC_BASE_URL } from '@/config/externalApps';
import { XoneAuthBackendError } from '@/services/auth-backends/xone';
import type { XoneResult } from '@/services/xone-api/types';

type OctopTicket = {
  launchUrl: string;
};

export async function getOctopLaunchUrl(): Promise<string> {
  const response = await request<XoneResult<OctopTicket | null>>(
    '/web/ai/octop/ticket',
    {
      method: 'POST',
      // 覆盖生产环境的演示 API baseURL，ticket 始终走工作台的 /web 代理。
      baseURL: '',
      skipErrorHandler: true,
    },
  );
  if (response.code !== 200) {
    throw new XoneAuthBackendError('获取免登票据', response);
  }
  const data = response.data;
  if (typeof data?.launchUrl !== 'string' || !data.launchUrl.trim()) {
    throw new Error('免登票据响应不完整');
  }

  // launch 属于 XOne；拼接 octopBaseUrl 会把交接请求送到错误服务。
  const baseText = XONE_PUBLIC_BASE_URL || window.location.origin;
  let base: URL;
  try {
    base = new URL(baseText);
  } catch {
    throw new Error(
      `免登跳转地址无效：XONE_PUBLIC_BASE_URL 不是合法地址（${baseText}）`,
    );
  }
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw new Error(
      `免登跳转地址无效：XONE_PUBLIC_BASE_URL 缺少 http(s)://（${baseText}）`,
    );
  }

  const launchUrl = new URL(data.launchUrl, base);
  if (
    !['http:', 'https:'].includes(launchUrl.protocol) ||
    launchUrl.origin !== base.origin ||
    launchUrl.username ||
    launchUrl.password
  ) {
    throw new Error(
      `免登跳转地址无效：launchUrl 指向 ${launchUrl.origin}，当前基准为 ${baseText}${
        XONE_PUBLIC_BASE_URL
          ? ''
          : '（XONE_PUBLIC_BASE_URL 未设置，已回退到页面 origin）'
      }`,
    );
  }
  return launchUrl.href;
}
