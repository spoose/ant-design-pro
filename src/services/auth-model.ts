/** POST /api/currentUser/get 返回的 Organization 数据范围元素。 */
export type DataScope = JushuAPI.DataScope;

/** 页面、菜单和权限规则共同消费的 Organization 访问模型。 */
export type OrganizationAccess = JushuAPI.OrganizationAccess;

/**
 * 稳定的前端当前用户模型。projectId 是 XOne 会话隔离字段；
 * Legacy 不提供时保持 undefined，既不伪造项目也不改变老 API 行为。
 */
export type AuthCurrentUser = JushuAPI.AuthCurrentUser & {
  projectId?: string;
};

/**
 * 页面最终消费的认证会话。activeOrganizationId 表示 Token/URL 当前组织，
 * defaultOrganizationId 仍属于 currentUser 的后端偏好，两者语义不能混用。
 */
export type AuthSession = {
  backend: 'legacy' | 'xone';
  projectId?: string;
  activeOrganizationId?: string;
  currentUser: AuthCurrentUser;
};
