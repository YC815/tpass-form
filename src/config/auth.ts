// tpass-form（consumer）SSO 設定中心。只讀 env，集中管理「對接 auth 所需的最少資訊」。
// 邊界：只需要 JWKS 公鑰來源與幾個 URL，絕不碰 auth 私鑰 / arctic / OAuth。
import "server-only";

const REQUIRED = [
  "AUTH_JWKS_URL",
  "AUTH_LOGIN_URL",
  "AUTH_LOGOUT_URL",
  "FORM_SELF_URL",
  "PORTAL_URL",
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
  // 登出：夾帶 redirect_uri 回到自己首頁，登出後留在 T-Form 而不是被丟到 auth。
  logoutUrl: `${process.env.AUTH_LOGOUT_URL}?redirect_uri=${encodeURIComponent(self)}`,
  selfUrl: self,
  // 回門戶大廳的網址（navbar 按鈕用）。env 驅動，絕不寫死網域。
  portalUrl: process.env.PORTAL_URL!,
  issuer: process.env.JWT_ISSUER!,
  audience: process.env.JWT_AUDIENCE!,
  cookieName: process.env.TPASS_COOKIE_NAME!,
} as const;
