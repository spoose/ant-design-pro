import { login as legacyLogin } from '../jushu-api/authentication';
import {
  getCurrentUser as getLegacyCurrentUser,
  setDefaultOrganization,
} from '../jushu-api/currentUser';
import type { AuthBackend } from './types';

/**
 * 老 API 实现保持当前项目行为：登录不需要 projectId，切换组织也不会签发新 Token。
 * 它与 XOne 实现共享 AuthBackend 接口，便于通过构建配置安全回切。
 */
export const legacyAuthBackend: AuthBackend = {
  kind: 'legacy',

  async login(input, options) {
    // Legacy 当前只有账号密码接口，因此 authType 已由公共类型约束为 password，无需传给老 API。
    const response = await legacyLogin(
      { account: input.username, password: input.password },
      options,
    );
    return {
      accessToken: response.data.accessToken,
      tokenType: response.data.tokenType,
    };
  },

  async loadCurrentUser(options) {
    const response = await getLegacyCurrentUser(options);
    return { source: 'legacy', currentUser: response.data };
  },

  async switchOrganization(organizationId, options) {
    const response = await setDefaultOrganization(
      { organizationId },
      options,
    );
    return {
      organizationId: response.data.defaultOrganizationId,
    };
  },
};
