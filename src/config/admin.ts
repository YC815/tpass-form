// 授權判斷（契約 v2「各服務本地授權」）：只讀 T-Pass 通行證上的 groups 章，
// 不再自維護名單、不查 DB。名單維護統一搬到中央（auth 的 AUTH_GROUPS 設定）。
//   admin       = 一般管理員（可管問卷）
//   super-admin = 超級管理員（可讀任何人的問卷回覆等），隱含 admin
import "server-only";
import type { TPassClaims } from "@/lib/tpass-auth";

export function isSuperAdmin(session: TPassClaims | null | undefined): boolean {
  return session?.groups.includes("super-admin") ?? false;
}

export function isAdmin(session: TPassClaims | null | undefined): boolean {
  if (!session) return false;
  return session.groups.includes("admin") || session.groups.includes("super-admin");
}
