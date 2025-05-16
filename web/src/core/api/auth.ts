import { env } from "~/env";
import { resolveServiceURL } from "./resolve-service-url";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  username: string;
  email: string;
  id: number;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const formData = new FormData();
  formData.append("username", email);  // OAuth2 使用 username 字段
  formData.append("password", password);

  const response = await fetch(resolveServiceURL("auth/token"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "登录失败");
  }

  const data = await response.json();
  // 保存token到localStorage
  localStorage.setItem("auth_token", data.access_token);
  return data;
}

export async function register(username: string, email: string, password: string): Promise<{ msg: string }> {
  const response = await fetch(resolveServiceURL("auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    } as RegisterData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(Array.isArray(error.detail) 
      ? error.detail[0]?.msg || "注册失败" 
      : error.detail || "注册失败");
  }

  return await response.json();
}

export async function getCurrentUser(): Promise<UserInfo> {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("未登录");
  }

  const response = await fetch(resolveServiceURL("auth/me"), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      throw new Error("登录已过期");
    }
    throw new Error("获取用户信息失败");
  }

  return await response.json();
}

export function logout(): void {
  localStorage.removeItem("auth_token");
} 