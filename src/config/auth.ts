// tpass-form（consumer）SSO 設定中心。只讀 env，集中管理「對接 auth 所需的最少資訊」。
// 邊界：只需要 JWKS 公鑰來源與幾個 URL，絕不碰 auth 私鑰 / arctic / OAuth。
import "server-only";

const REQUIRED = [
  "AUTH_JWKS_URL",
  "AUTH_LOGIN_URL",
  "AUTH_LOGOUT_URL",
  "FORM_SELF_URL",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "TPASS_COOKIE_NAME",
] as const;

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `[config/auth] 缺少必填環境變數：${missing.join(", ")}（請檢查 .env.local）`,
  );
}

const self = process.env.FORM_SELF_URL!;

// 登入回跳路徑可帶相對路徑（例如剛要填的那份問卷），組成完整 redirect_uri。
export function loginUrlFor(returnPath = "/"): string {
  const redirect = new URL(returnPath, self).toString();
  return `${process.env.AUTH_LOGIN_URL}?redirect_uri=${encodeURIComponent(redirect)}`;
}

export const authConfig = {
  jwksUrl: process.env.AUTH_JWKS_URL!,
  loginUrl: loginUrlFor("/"),
  logoutUrl: process.env.AUTH_LOGOUT_URL!,
  selfUrl: self,
  issuer: process.env.JWT_ISSUER!,
  audience: process.env.JWT_AUDIENCE!,
  cookieName: process.env.TPASS_COOKIE_NAME!,
} as const;
