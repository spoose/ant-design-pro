// @ts-ignore
/* eslint-disable */
import { request } from "@umijs/max";

/** 分页查询平台人员 仅 Super Admin 可调用。查询条件、分页和排序字段均通过 JSON Body 传入。 POST /api/admin/users/list */
export async function listAdminUsers(
  body: JushuAPI.AdminUserListRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.AdminUserPageResponse>("/api/admin/users/list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 替换用户的组织归属 仅 Super Admin 可调用。事务内替换有效 Membership，并清理已移出组织的 Grant。 POST /api/admin/users/organizations/set */
export async function setAdminUserOrganizations(
  body: JushuAPI.SetAdminUserOrganizationsRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.SetAdminUserOrganizationsResponse>(
    "/api/admin/users/organizations/set",
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

/** 停用或恢复平台人员 仅 Super Admin 可调用。不能停用当前登录用户或最后一个有效 Super Admin。 POST /api/admin/users/status/set */
export async function setAdminUserStatus(
  body: JushuAPI.SetAdminUserStatusRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.SetAdminUserStatusResponse>(
    "/api/admin/users/status/set",
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
