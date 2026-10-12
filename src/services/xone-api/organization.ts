import { request } from '@umijs/max';
import type {
  XoneOrganization,
  XoneResult,
  XoneSelectOrganizationData,
  XoneSelectOrganizationRequest,
} from './types';

/**
 * 查询当前 Token 对应 projectId 下可进入的组织；组织级 Token 可能返回 null。
 * 真实后端只实现 `/list`；OpenAPI 里同义的 `/listOrgs` 实测返回 404，不要改回。
 */
export async function listOrganizations(options?: Record<string, unknown>) {
  return request<XoneResult<XoneOrganization[] | null>>(
    '/web/system/organization/list',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {},
      ...(options ?? {}),
    },
  );
}
/**
 * 使用目标 organizationId 换取携带新组织上下文的 Token。
 * 真实后端只实现 `/selectAndChange`；OpenAPI 里同义的 `/selectAndChangeOrg` 实测返回 404。
 */
export async function selectAndChangeOrganization(
  body: XoneSelectOrganizationRequest,
  options?: Record<string, unknown>,
) {
  return request<XoneResult<XoneSelectOrganizationData>>(
    '/web/system/organization/selectAndChange',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
      ...(options ?? {}),
    },
  );
}
