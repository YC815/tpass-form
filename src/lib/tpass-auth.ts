// ★ T-Pass SSO 驗章（直接照抄 t-pass/src/lib/tpass-auth.ts 的參考實作）★
// 只靠 JWKS 公鑰在自己後端本地驗章認出使用者，全程不回呼 auth、不碰私鑰。
//
// 安全四鐵則（務必照做，缺一不可）：
//   1. 鎖 algorithms: ['EdDSA'] —— 不鎖會有 alg confusion 偽造風險（公鑰被當對稱密鑰）。
//   2. 檢查 issuer —— 確認是「這個 auth」發的票。
//   3. 檢查 audience: 'tschool-sso' —— 確認是發給我們這個生態系的票。
//   4. exp 過期檢查（jose 預設會驗，別關掉）。
// 驗章只能在 server 端做（cookie 是 HttpOnly，瀏覽器 JS 拿不到）。
import "server-only";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { authConfig } from "@/config/auth";

// T-Pass 通行證的身分內容（對接合約，詳見 auth/INTEGRATION.md）。
export interface TPassClaims {
  sub: string;
  email: string;
  name: string;
  role: string;
  grade: string | null;
  exp: number;
}

// createRemoteJWKSet 內建記憶體快取 + 依 kid 選鑰 + 金鑰輪替時自動重抓。
const JWKS = createRemoteJWKSet(new URL(authConfig.jwksUrl));

// 驗一個 token。失敗（過期 / 竄改 / 錯 iss/aud / 錯演算法）一律回 null，不外拋。
export async function verifySession(token: string): Promise<TPassClaims | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["EdDSA"],
      issuer: authConfig.issuer,
      audience: authConfig.audience,
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      grade: (payload.grade as string | null) ?? null,
      exp: payload.exp as number,
    };
  } catch (e) {
    // [TEMP DEBUG] 逼出被吞掉的真實錯誤，定位後移除。
    console.error("[tpass-auth] verifySession 失敗:", e);
    return null;
  }
}

// 從頂層 cookie 讀目前 session，回 claims 或 null。
export async function getSession(): Promise<TPassClaims | null> {
  const token = (await cookies()).get(authConfig.cookieName)?.value;
  // [TEMP DEBUG] 確認 cookie 是否讀得到、長度多少。
  console.error("[tpass-auth] cookie", authConfig.cookieName, "=", token ? `present(len=${token.length})` : "MISSING");
  if (!token) return null;
  return verifySession(token);
}
