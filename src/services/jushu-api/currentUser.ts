// @ts-ignore
/* eslint-disable */
import { request } from "@umijs/max";

/** 获取当前用户访问范围 返回用户身份、Platform 权限以及真正可以进入的 Organization。 GET /api/currentUser */
export async function getCurrentUser(options?: { [key: string]: unknown }) {
  return request<JushuAPI.CurrentUserResponse>("/api/currentUser", {
    method: "GET",
    ...(options || {}),
  });
}

/** 设置当前用户的默认组织 仅允许保存当前用户可以实时进入的活跃 Organization。用户身份只从 Bearer Token 获取。 PUT /api/users/me/default-organization */
export async function setDefaultOrganization(
  body: JushuAPI.SetDefaultOrganizationRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.SetDefaultOrganizationResponse>(
    "/api/users/me/default-organization",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}
