import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';

// Initialize dayjs plugins globally
dayjs.extend(relativeTime);

import {
  AvatarDropdown,
  DocLink,
  ErrorBoundary,
  Footer,
  LangDropdown,
  OfflineBanner,
  VersionDropdown,
} from '@/components';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import type { AuthCurrentUser } from '@/services/auth';
import { clearAccessToken } from '@/utils/authToken';
import {
  clearCurrentContextId,
  resolveCurrentContextId,
} from '@/utils/currentContext';
import { groupTemplateExampleMenus } from '@/utils/menuData';
import defaultSettings from '../config/defaultSettings';
import { SysSwitch } from './components/RightContent/SysSwitch';
import { errorConfig } from './requestErrorConfig';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';
const selectEntryPath = '/user/select-entry';
const authFreePaths = [loginPath, '/user/register', '/user/register-result'];
const userFlowPaths = [...authFreePaths, selectEntryPath];

const isUnauthorizedError = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status === 401;

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: AuthCurrentUser;
  currentContextId?: string;
  loading?: boolean;
  fetchUserInfo?: () => Promise<AuthCurrentUser | undefined>;
  settingDrawerOpen?: boolean;
}> {
  const fetchUserInfo = async (): Promise<AuthCurrentUser | undefined> => {
    try {
      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg.data as AuthCurrentUser;
    } catch (error) {
      if (!isUnauthorizedError(error)) throw error;

      // RefreshTokenResult 和 refreshAccessToken 暂时保留在 auth service；
      // 当前 access-token-only 链路不自动刷新，后端接口就绪后再接入重试。
      clearAccessToken();
      clearCurrentContextId();
      const { pathname, search, hash } = history.location;
      history.replace(
        `${loginPath}?redirect=${encodeURIComponent(pathname + search + hash)}`,
      );
    }
    return undefined;
  };

  const { location } = history;
  if (!authFreePaths.includes(location.pathname)) {
    const currentUser = await fetchUserInfo();
    const currentContextId = currentUser
      ? resolveCurrentContextId(
          currentUser.contexts,
          currentUser.defaultContextId,
        )
      : undefined;
    return {
      fetchUserInfo,
      currentUser,
      currentContextId,
      settings: defaultSettings as Partial<LayoutSettings>,
      settingDrawerOpen: false,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
    settingDrawerOpen: false,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
//告诉整个应用的后台布局怎么渲染、怎么跳转、顶部右侧放什么、头像区怎么显示、页面切换时怎么做权限检查。
//initialState：就是 getInitialState() 返回的数据，比如 currentUser、settings、currentContextId
//setInitialState：更新全局状态的方法
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    menuDataRender: groupTemplateExampleMenus,
    menuItemRender: (item, dom) => {
      if (item.path) {
        return (
          <Link to={item.path} prefetch>
            {dom}
          </Link>
        );
      }
      return dom;
    },
    actionsRender: () => {
      // `locale: false` opts out of the language switcher. ProLayout's own
      // `locale` prop is a locale string, so narrow to the boolean toggle here.
      const localeEnabled =
        (initialState?.settings as { locale?: boolean })?.locale !== false;
      return [
        <SysSwitch key="switch" />,
        <DocLink key="doc" />,
        <VersionDropdown key="version" />,
        localeEnabled && <LangDropdown key="lang" />,
      ].filter(Boolean);
    },
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: initialState?.currentUser?.name,
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    // waterMarkProps: {
    //   content: initialState?.currentUser?.name,
    // },
    footerRender: () => <Footer />,
    //每次页面变化时检查用户是否已登录 负责兜底页面保护
    onPageChange: () => {
      const { location } = history;
      const currentPath = location.pathname;
      const currentUrl = currentPath + location.search + location.hash;
      const isUserFlowPath = userFlowPaths.includes(currentPath);
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && !isUserFlowPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(currentUrl)}`,
        );
        return;
      }
      if (
        initialState?.currentUser &&
        !initialState.currentContextId &&
        !isUserFlowPath
      ) {
        history.replace(
          `${selectEntryPath}?redirect=${encodeURIComponent(currentUrl)}`,
        );
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    // Replace ProLayout's default ErrorBoundary with our offline-aware version,
    // so chunk load errors show friendly messages instead of "Something went wrong."
    ErrorBoundary,
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          <SettingDrawer
            disableUrlParams
            enableDarkTheme
            collapse={initialState?.settingDrawerOpen}
            onCollapseChange={(open) => {
              setInitialState((s) => ({
                ...s,
                settingDrawerOpen: open,
              }));
            }}
            settings={initialState?.settings}
            onSettingChange={(settings) => {
              setInitialState((s) => ({
                ...s,
                settings,
              }));
            }}
          />
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL: isDev ? '' : 'https://pro-api.ant-design-demo.workers.dev',
  ...errorConfig,
};

export function rootContainer(container: React.ReactNode) {
  return (
    <>
      <OfflineBanner />
      <ErrorBoundary>{container}</ErrorBoundary>
    </>
  );
}
