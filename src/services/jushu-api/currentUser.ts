// @ts-ignore
/* eslint-disable */
import { request } from "@umijs/max";

/** 获取当前用户访问范围 返回用户身份、Platform 权限以及真正可以进入的 Organization。 POST /api/currentUser/get */
export async function getCurrentUser(options?: { [key: string]: unknown }) {
  return request<JushuAPI.CurrentUserResponse>("/api/currentUser/get", {
    method: "POST",
    ...(options || {}),
  });
}

/** 设置当前用户的默认组织 仅允许保存当前用户可以实时进入的活跃 Organization。用户身份只从 Bearer Token 获取。 POST /api/users/me/default-organization/set */
export async function setDefaultOrganization(
  body: JushuAPI.SetDefaultOrganizationRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.SetDefaultOrganizationResponse>(
    "/api/users/me/default-organization/set",
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

/** 更新当前用户基本资料 更新 display_name / avatar_url。用户身份只从 Bearer Token 获取。 POST /api/users/me/update */
export async function updateCurrentUserProfile(
  body: JushuAPI.UpdateCurrentUserProfileRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.CurrentUserResponse>("/api/users/me/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
