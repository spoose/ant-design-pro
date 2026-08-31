/** XOne 使用 code/data/msg 信封；历史响应确认成功业务码为 200。 */
export type XoneResult<T> = {
  code: number;
  data: T;
  msg: string;
};

/** XOne 账号密码登录请求；字段名保持与上游 OpenAPI 一致。 */
export type XoneLoginRequest = {
  projectId: number;
  authType: 'password';
  identifier: string;
  credential: string;
};

export type XoneLoginData = {
  token: string;
};

/**
 * 真实历史响应中的 id 是字符串，OpenAPI 却声明为 int64。
 * 原始 API 层兼容两种类型，后续领域适配层统一转换为字符串。
 */
export type XoneOrganization = {
  id: string | number;
  organizationCode?: string;
  organizationName?: string;
  defaultFlag?: boolean;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type XoneSelectOrganizationRequest = {
  organizationId: number;
};

export type XoneSelectOrganizationData = {
  token: string;
};
