import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { getIntl, history } from '@umijs/max';
import { message, notification } from 'antd';
import { getAccessToken } from '@/utils/authToken';
import { getWorkspaceOrganizationId } from '@/utils/workspaceRoutes';

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: unknown;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                title: errorCode,
                description: errorMessage,
              });
              break;
            case ErrorShowType.REDIRECT:
              window.location.href = '/user/login';
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        message.error(`Response status:${error.response.status}`);
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        message.error(
          getIntl().formatMessage({
            id: 'app.request.offline',
            defaultMessage:
              'Network unavailable. Please check your connection and try again.',
          }),
        );
      } else if (error.request) {
        message.error('None response! Please retry.');
      } else {
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，进行个性化处理。
      // 示例：为请求附加 token（按需启用）
      // const token = localStorage.getItem('token');
      // if (token) {
      //   config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      // }
      const token = getAccessToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      // pathname 来自 Umi Browser Router；Organization Header 不读取额外全局 State。
      const { pathname } = history.location;
      // organizationId 由 /workspace/org/:organizationId/* 解析，Platform URL 返回 undefined。
      const organizationId = getWorkspaceOrganizationId(pathname);
      // requestPath 来自当前 request(config)，去掉 query 后用于判断 API 授权域。
      const requestPath = config.url?.split('?')[0] ?? '';
      // Platform API 只使用 Platform 权限，禁止携带 Organization Header。
      const isPlatformApi = requestPath.startsWith('/api/platform/');
      // 认证、用户身份和默认组织接口不从当前 Organization URL 继承业务范围。
      const isScopeNeutralApi = [
        '/api/currentUser',
        '/api/register',
        '/api/login/account',
        '/api/login/outLogin',
        '/api/users/me/default-organization',
      ].includes(requestPath);
      // 链路：当前 Organization URL -> organizationId -> X-Organization-Id -> 后端再次鉴权。
      if (organizationId && !isPlatformApi && !isScopeNeutralApi) {
        config.headers = {
          ...config.headers,
          'X-Organization-Id': organizationId,
        };
      }
      return config;
    },
  ],

  // 响应拦截器
  responseInterceptors: [],
};
