/**
 * XOne 登录 Token 中当前允许读取的非授权身份字段。
 * authorities、过期时间等安全相关 claim 必须由后端校验，前端不据此授权。
 */
export type XoneTokenClaims = {
  userId?: unknown;
  projectId?: unknown;
  organizationId?: unknown;
  sub?: unknown;
};

/** XOne Token 无法提供会话身份时，交给登录页展示该错误并要求重新登录。 */
export class XoneTokenClaimsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XoneTokenClaimsError';
  }
}

/** 将 JWT 的 Base64URL payload 恢复成 UTF-8 JSON 文本。 */
const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0),
  );
  return new TextDecoder().decode(bytes);
};

/**
 * 只解码 XOne JWT payload，不验证签名，也不用于判断权限或 Token 是否有效。
 * Token 缺失或解析失败时立即报错，不使用本地元数据伪造用户身份。
 */
export const decodeXoneTokenClaims = (
  accessToken?: string,
): XoneTokenClaims => {
  const payload = accessToken?.split('.')[1];
  if (!payload) {
    throw new XoneTokenClaimsError('登录 Token 缺失或格式错误，请重新登录');
  }
  try {
    const claims: unknown = JSON.parse(decodeBase64Url(payload));
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
      throw new Error('payload must be an object');
    }
    const record = claims as Record<string, unknown>;
    return {
      userId: record.userId,
      projectId: record.projectId,
      organizationId: record.organizationId,
      sub: record.sub,
    };
  } catch {
    throw new XoneTokenClaimsError('登录 Token 无法解析，请重新登录');
  }
};

const toRequiredClaimString = (claimName: string, value: unknown) => {
  if (value === undefined || value === null) {
    throw new XoneTokenClaimsError(
      `XOne Token 缺少身份字段 ${claimName}，请重新登录`,
    );
  }
  const normalized = String(value).trim();
  if (!normalized) {
    throw new XoneTokenClaimsError(
      `XOne Token 缺少身份字段 ${claimName}，请重新登录`,
    );
  }
  return normalized;
};

/**
 * 登录 Token 是 XOne 正式登录身份来源：三个字段都必须存在，并与登录输入一致。
 * 返回值会作为切换 Token 不再携带 userId/projectId 时的已验证身份持久化。
 */
export const assertXoneLoginToken = (
  accessToken: string | undefined,
  expectedProjectId: string,
  expectedIdentifier: string,
) => {
  const claims = decodeXoneTokenClaims(accessToken);
  const userId = toRequiredClaimString('userId', claims.userId);
  const projectId = toRequiredClaimString('projectId', claims.projectId);
  const identifier = toRequiredClaimString('sub', claims.sub);
  if (projectId !== expectedProjectId) {
    throw new XoneTokenClaimsError(
      '登录 Token 中的 projectId 与登录输入不一致，请重新登录',
    );
  }
  if (identifier !== expectedIdentifier) {
    throw new XoneTokenClaimsError(
      '登录 Token 中的 sub 与登录 identifier 不一致，请重新登录',
    );
  }
  return { userId, projectId, identifier };
};

/**
 * 校验 Token 的登录主体。前端只比较明文字段；签名、过期和注销状态仍由 listOrgs 后端校验。
 */
export const assertXoneTokenSubject = (
  accessToken: string | undefined,
  expectedIdentifier: string,
) => {
  const { sub } = decodeXoneTokenClaims(accessToken);
  const tokenSubject = toRequiredClaimString('sub', sub);
  if (tokenSubject !== expectedIdentifier) {
    throw new XoneTokenClaimsError(
      'XOne Token 中的 sub 与登录 identifier 不一致，请重新登录',
    );
  }
  return tokenSubject;
};

/**
 * 组织切换 Token 必须同时属于当前登录主体和用户选择的组织；不读取缺失的 userId/projectId。
 */
export const assertXoneOrganizationSwitchToken = (
  accessToken: string | undefined,
  expectedIdentifier: string,
  expectedOrganizationId: string,
) => {
  const claims = decodeXoneTokenClaims(accessToken);
  const tokenSubject = toRequiredClaimString('sub', claims.sub);
  const tokenOrganizationId = toRequiredClaimString(
    'organizationId',
    claims.organizationId,
  );
  if (tokenSubject !== expectedIdentifier) {
    throw new XoneTokenClaimsError(
      '切换组织后的 Token 用户与当前登录用户不一致，请重新登录',
    );
  }
  if (tokenOrganizationId !== expectedOrganizationId) {
    throw new XoneTokenClaimsError(
      '切换组织后的 Token organizationId 与目标组织不一致，请重试',
    );
  }
  return { organizationId: tokenOrganizationId, subject: tokenSubject };
};
