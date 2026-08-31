import { legacyAuthBackend } from './legacy';
import type { AuthBackend, AuthBackendKind } from './types';
import { xoneAuthBackend } from './xone';

export type {
  AuthBackend,
  AuthBackendIdentitySnapshot,
  AuthBackendKind,
  AuthBackendLoginInput,
  AuthBackendLoginResult,
  AuthBackendRequestOptions,
  AuthBackendSwitchResult,
} from './types';

/** 两套实现的注册表；切换后端不需要修改页面或认证业务函数。 */
const authBackends: Record<AuthBackendKind, AuthBackend> = {
  legacy: legacyAuthBackend,
  xone: xoneAuthBackend,
};

/**
 * 读取构建时 AUTH_BACKEND。默认 legacy 保持现有行为，只有显式配置 xone 才启用 XOne。
 */
export const getConfiguredAuthBackendKind = (): AuthBackendKind =>
  process.env.AUTH_BACKEND === 'xone' ? 'xone' : 'legacy';

/** 核心选择函数；测试可显式传 kind，生产代码默认读取构建配置。 */
export const resolveAuthBackend = (
  kind: AuthBackendKind = getConfiguredAuthBackendKind(),
) => authBackends[kind];
