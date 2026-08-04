// @ts-ignore
/* eslint-disable */
import { request } from "@umijs/max";

/** 账号密码登录 account 可为用户名或邮箱。成功后返回 Bearer Access Token。 POST /api/login/account */
export async function login(
  body: JushuAPI.LoginRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.LoginResponse>("/api/login/account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 注册账户 创建账户但不自动登录，也不签发 Access Token。 POST /api/register */
export async function register(
  body: JushuAPI.RegisterRequest,
  options?: { [key: string]: unknown }
) {
  return request<JushuAPI.RegisterResponse>("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
