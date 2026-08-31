// @ts-ignore
/* eslint-disable */
import { request } from "@umijs/max";

/** 创建组织 仅 Super Admin 可调用。创建组织及创建者的初始 Membership、权限和 App。 POST /api/admin/organizations/create */
export async function createOrganization(
  body: JushuAPI.CreateOrganizationRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.OrganizationResponse>(
    "/api/admin/organizations/create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 删除未投入使用的组织 仅 Super Admin 可调用。存在额外成员或授权时拒绝删除。 POST /api/admin/organizations/delete */
export async function deleteOrganization(
  body: JushuAPI.DeleteOrganizationRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.DeleteOrganizationResponse>(
    "/api/admin/organizations/delete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 查询组织目录 仅 Super Admin 可调用。返回全部组织摘要。 POST /api/admin/organizations/list */
export async function listOrganizations(options?: { [key: string]: unknown }) {
  return request<JushuAPI.OrganizationListResponse>(
    "/api/admin/organizations/list",
    {
      method: "POST",
      ...(options || {}),
    }
  );
}

/** 更新组织 仅 Super Admin 可调用。organizationCode 不可修改。 POST /api/admin/organizations/update */
export async function updateOrganization(
  body: JushuAPI.UpdateOrganizationRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.OrganizationResponse>(
    "/api/admin/organizations/update",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}
