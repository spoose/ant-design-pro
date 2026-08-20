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
  OfflineBanner,
  WorkspaceTabsHeader,
} from '@/components';
import {
  type AuthCurrentUser,
  getCurrentUser as queryCurrentUser,
} from '@/services/auth';
import { surfaceColors, workspaceIconColorVariables } from '@/theme/colors';
import { handleAccessTokenFailure } from '@/utils/authFailure';
import { getAccessToken } from '@/utils/authToken';
import {
  groupTemplateExampleMenus,
  resolveWorkspaceMenuDescriptor,
} from '@/utils/menuData';
import defaultSettings from '../config/defaultSettings';
import { OrganizationSwitch } from './components/RightContent/OrganizationSwitch';
import { errorConfig } from './requestErrorConfig';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';
const selectEntryPath = '/user/select-entry';
const authFreePaths = [
  loginPath,
  '/user/register',
  '/user/register-result',
  '/user/forgot-password',
  '/user/reset-password',
];
const userFlowPaths = [...authFreePaths, selectEntryPath];

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: AuthCurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<AuthCurrentUser | undefined>;
  settingDrawerOpen?: boolean;
}> {
  const fetchUserInfo = async (): Promise<AuthCurrentUser | undefined> => {
    try {
      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg.data;
    } catch (error) {
      // 初始化与运行期请求使用同一错误码规则，避免把 BAD_CREDENTIALS 误判为登录失效。
      if (!handleAccessTokenFailure(error)) throw error;
    }
    return undefined;
  };

  const { location } = history;
  if (!authFreePaths.includes(location.pathname)) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
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
// initialState 是 getInitialState() 返回的 currentUser 与 settings；当前 Scope 只从 URL 派生。
//setInitialState：更新全局状态的方法
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  // 当前地址来自 Umi Browser Router；仅 Workspace 路由使用无外边距的应用壳布局。
  const isWorkspaceRoute = history.location.pathname.startsWith('/workspace/');
  // 个人设置 / 个人中心为账号级页面：保留顶栏，隐藏模板侧栏。
  const isAccountRoute = history.location.pathname.startsWith('/account');
  // 头像链路：currentUser.avatar 有值时显示图片；为空或图片加载失败时显示姓名首字符。
  const currentUserName = initialState?.currentUser?.name?.trim();
  const avatarInitial = currentUserName
    ? Array.from(currentUserName)[0]?.toLocaleUpperCase()
    : undefined;

  return {
    menuRender: isAccountRoute ? false : undefined,
    menuDataRender: (menuData) => {
      // URL 是当前 Scope、标签和 Sidebar 的唯一来源。
      const { pathname } = history.location;
      const workspaceMenu = resolveWorkspaceMenuDescriptor(
        initialState?.currentUser,
        pathname,
      );
      if (workspaceMenu) return workspaceMenu.items;
      // 无权或无效的 Workspace URL 不回退到模板菜单，避免误导用户离开当前壳层。
      if (pathname.startsWith('/workspace/')) return [];
      return groupTemplateExampleMenus(menuData);
    },
    // 标签直接进入 ProLayout 顶栏；路由页面不再需要 WorkspaceLayout/WorkspaceShell 包裹。
    headerContentRender: (_, defaultDom) =>
      isWorkspaceRoute ? <WorkspaceTabsHeader /> : defaultDom,
    menuExtraRender: ({ collapsed }) => {
      const workspaceMenu = resolveWorkspaceMenuDescriptor(
        initialState?.currentUser,
        history.location.pathname,
      );
      if (!workspaceMenu) return null;

      return (
        <div
          className={`flex h-11 items-center border-b border-zinc-200 px-3 dark:border-zinc-800 ${
            collapsed ? 'justify-center' : 'gap-2'
          }`}
          // 暂时隐藏侧栏身份栏；保留管理中心/组织/App 的完整渲染代码。
          style={{ display: 'none' }}
        >
          {/* Badge 始终保留；展开时只补充 Organization/App 名称，不显示范围副标题。 */}
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--workspace-icon-background)] text-xs font-semibold text-[var(--workspace-icon-foreground)] dark:bg-[var(--workspace-icon-background-dark)] dark:text-[var(--workspace-icon-foreground-dark)]"
            style={workspaceIconColorVariables}
          >
            {workspaceMenu.badge}
          </span>
          {!collapsed && (
            <strong className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {workspaceMenu.title}
            </strong>
          )}
        </div>
      );
    },
    stylish: {
      /**
       * Workspace 顶栏视觉链路：
       * defaultSettings.siderWidth(248) -> Logo 区宽度 -> 标签从 Sidebar 右缘开始；
       * 640px 以下才把 56px 操作行与 48px 标签行组合成 104px 顶栏。
       */
      header: ({
        antCls,
        colorBgContainer,
        colorBorder,
        margin,
        paddingXS,
        proComponentsCls,
      }) => {
        // 导航壳用容器白；70% 混合保留层次，暗色模式仍跟 token。
        const workspaceHeaderBackground = `color-mix(in srgb, ${colorBgContainer} 70%, transparent)`;

        return {
          ...(isWorkspaceRoute
            ? {
                height: 56,
                backgroundColor: colorBgContainer,
                background: workspaceHeaderBackground,
                borderBlockEnd: 0,
                [`${proComponentsCls}-global-header`]: {
                  marginInline: 0,
                  paddingInlineEnd: margin,
                  backgroundColor: colorBgContainer,
                  background: workspaceHeaderBackground,
                  // 暂时隐藏 Workspace 顶栏头像容器；avatarProps 与下拉菜单逻辑继续保留。
                  // [`${proComponentsCls}-global-header-header-actions-avatar`]: {
                  //   display: 'none',
                  // },
                  // headerContentRender 的匿名容器承载 WorkspaceTabsHeader；允许它在窄宽度内收缩。
                  '> div:not([class])': {
                    minWidth: 0,
                    height: '100%',
                  },
                  [`${proComponentsCls}-global-header-collapsed-button:hover`]:
                    {
                      background: surfaceColors.navChromeRaised,
                    },
                  [`${proComponentsCls}-global-header-header-actions-item ${antCls}-btn:hover`]:
                    {
                      background: `${surfaceColors.navChromeRaised} !important`,
                    },
                  '@media (min-width: 768px)': {
                    [`${proComponentsCls}-global-header-logo-mix`]: {
                      boxSizing: 'border-box',
                      width: 248,
                      height: '100%',
                      marginInlineEnd: 0,
                      paddingInline: margin,
                      flex: '0 0 248px',
                      backgroundColor: colorBgContainer,
                      background: workspaceHeaderBackground,
                      borderInlineEnd: `1px solid ${colorBgContainer}`,
                    },
                  },
                },
                '@media (max-width: 767px)': {
                  height: 56,
                  lineHeight: 'normal',
                  [`${proComponentsCls}-global-header`]: {
                    height: 56,
                    marginInline: 0,
                    paddingInline: paddingXS,
                    alignItems: 'center',
                    backgroundColor: colorBgContainer,
                    background: workspaceHeaderBackground,
                    [`${proComponentsCls}-global-header-collapsed-button`]: {
                      width: 44,
                      height: 56,
                      marginInlineEnd: 0,
                      flex: '0 0 44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    [`${proComponentsCls}-global-header-logo-mobile`]: {
                      width: 28,
                      height: 56,
                      flex: '0 0 28px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    },
                    [`${proComponentsCls}-global-header-right-content`]: {
                      // ProLayout 会保留桌面测得的内联尺寸；移动布局改用实际图标宽度，避免挤压标签。
                      height: '56px !important',
                      minWidth: '0 !important',
                      marginInlineStart: 'auto',
                    },
                    [`${proComponentsCls}-global-header-header-actions-item`]: {
                      paddingInline: 0,
                      '> *': {
                        minWidth: 44,
                        minHeight: 44,
                      },
                    },
                    [`${proComponentsCls}-global-header-header-actions-avatar`]:
                      {
                        paddingInline: 0,
                        '> div': {
                          minWidth: 44,
                          minHeight: 44,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      },
                    // 手机只保留头像；用户名在有限宽度里隐藏，但账号菜单仍可点击。
                    [`${proComponentsCls}-global-header-header-actions-avatar span:not(${antCls}-avatar)`]:
                      {
                        display: 'none',
                      },
                  },
                },
                '@media (max-width: 639px)': {
                  height: 104,
                  [`${proComponentsCls}-global-header`]: {
                    height: 104,
                    alignItems: 'flex-start',
                    // 窄屏下标签独占第二行，避免与 Logo、全局操作争抢水平空间。
                    '> div:not([class])': {
                      position: 'absolute',
                      insetBlockStart: 56,
                      insetInline: 0,
                      height: 48,
                      minWidth: 0,
                      backgroundColor: colorBgContainer,
                      background: workspaceHeaderBackground,
                      borderBlockStart: `1px solid ${colorBorder}`,
                    },
                  },
                },
              }
            : {}),
        };
      },
      // 将 ProLayout 默认菜单间距调整为已确认 demo 的 44px 身份栏与 40px 菜单项。
      sider: ({
        antCls,
        borderRadius,
        colorBgContainer,
        fontSize,
        fontSizeLG,
        paddingXXS,
        paddingXS,
      }) => ({
        // 导航壳白底；hover / 选中用低饱和浅蓝，激活图标/文字用 navActiveInk。
        ...(isWorkspaceRoute
          ? {
              background: colorBgContainer,
              [`& ${antCls}-layout-sider-children`]: {
                background: colorBgContainer,
                borderInlineEnd: 0,
                // marginInlineEnd: 0,
              },
              [`${antCls}-menu`]: {
                background: colorBgContainer,
                fontSize,
              },
              [`${antCls}-menu-item-selected, ${antCls}-menu-submenu-selected > ${antCls}-menu-submenu-title`]:
                {
                  color: surfaceColors.navActiveInk,
                  background: surfaceColors.navChromeRaised,
                  '.anticon': {
                    color: surfaceColors.navActiveInk,
                  },
                  svg: {
                    fill: 'currentColor',
                  },
                },
              [`${antCls}-menu-item:not(${antCls}-menu-item-selected):hover, ${antCls}-menu-submenu:not(${antCls}-menu-submenu-selected) > ${antCls}-menu-submenu-title:hover`]:
                {
                  background: surfaceColors.navChromeRaised,
                },
              [`${antCls}-pro-sider-collapsed-button:hover`]: {
                background: surfaceColors.navChromeRaised,
              },
              // 折叠侧栏已有 8px 外层留白；菜单再留 4px，正好容纳并居中 ProLayout 的 40px 折叠标题。
              [`&${antCls}-pro-sider-collapsed ${antCls}-pro-sider-menu`]: {
                paddingInline: paddingXXS,
              },
            }
          : {}),
        [`${antCls}-pro-sider-extra`]: {
          margin: 0,
          ...(isWorkspaceRoute ? { background: colorBgContainer } : {}),
        },
        [`${antCls}-pro-sider-menu`]: {
          padding: paddingXS,
          ...(isWorkspaceRoute ? { background: colorBgContainer } : {}),
        },
        [`${antCls}-menu-submenu`]: {
          width: '100%',
        },
        // pAI 等带子项的菜单走 submenu-title；高度和左边距必须与普通 menu-item 一致，图标才对齐。
        [`${antCls}-menu-item, ${antCls}-menu-submenu-title`]: {
          width: '100%',
          height: 40,
          minHeight: 40,
          marginBlock: 2,
          marginInline: 0,
          borderRadius,
          display: 'flex',
          alignItems: 'center',
        },
        [`${antCls}-menu-item a, ${antCls}-menu-submenu-title a`]: {
          display: 'inline-flex',
          alignItems: 'center',
          minWidth: 0,
          color: 'inherit',
        },
        [`${antCls}-menu-item .anticon, ${antCls}-menu-submenu-title .anticon`]:
          {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: fontSizeLG,
            minWidth: fontSizeLG,
            height: fontSizeLG,
            fontSize: fontSizeLG,
            lineHeight: 0,
          },
      }),
    },
    // Workspace 页面使用自己的标题区和内容间距，不能再叠加 ProLayout 页面留白。
    // 右侧 16px 留给顶栏同色缝隙，由 global.less 控制，不能在这里用 margin: 0 覆盖。
    contentStyle: isWorkspaceRoute
      ? { padding: 0, marginBlock: 0, marginInlineStart: 0 }
      : undefined,
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
      // 顶栏只保留当前工作流需要的组织切换与文档入口。
      return [<OrganizationSwitch key="switch" />, <DocLink key="doc" />];
    },
    avatarProps: {
      src: initialState?.currentUser?.avatar || undefined,
      title: currentUserName,
      // ProLayout 只有在 src、icon 或 children 存在时才会创建 Avatar。
      children: avatarInitial,
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    // waterMarkProps: {
    //   content: initialState?.currentUser?.name,
    // },
    footerRender: isWorkspaceRoute ? false : () => <Footer />,
    //每次页面变化时检查用户是否已登录 负责兜底页面保护
    onPageChange: () => {
      const { location } = history;
      const currentPath = location.pathname;
      const currentUrl = currentPath + location.search + location.hash;
      const isUserFlowPath = userFlowPaths.includes(currentPath);
      // 如果没有登录，重定向到 login
      // 登录成功后的首次跳转可能早于 React 提交 currentUser；此时已签发 Token 是合法的短暂交接态。
      // 如果 Token 实际失效，fetchUserInfo() 的 401 分支会清理它并重新跳回登录页。
      if (!initialState?.currentUser && !getAccessToken() && !isUserFlowPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(currentUrl)}`,
        );
        return;
      }
    },
    bgLayoutImgList: isWorkspaceRoute
      ? []
      : [
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
    links:
      isDev && !isWorkspaceRoute
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
          {false && (
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
          )}
        </>
      );
    },
    ...initialState?.settings,
    // 仅给 Workspace 壳层增加样式作用域；URL 仍是 Scope、标签与 Sidebar 的唯一状态来源。
    className: isWorkspaceRoute ? 'workspace-layout' : undefined,
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
