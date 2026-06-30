"use server";

// 學生會成員名單管理（只有超管能動）。auth 沒有角色，這份白名單就是「誰能開問卷」的真相。
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/guard";
import { isSuperAdmin } from "@/config/admin";
import { prisma } from "@/lib/db";

export interface MemberResult {
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addAdminAction(
  _prev: MemberResult | null,
  formData: FormData,
): Promise<MemberResult> {
  const session = await requireSuperAdmin("/admin/members");
  const raw = formData.get("email");
  const email = (typeof raw === "string" ? raw : "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) return { ok: false, error: "請輸入有效的電子郵件。" };
  if (isSuperAdmin(email)) return { ok: false, error: "這個帳號已是種子超管。" };

  const exists = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { ok: false, error: "這個帳號已在名單中。" };

  await prisma.admin.create({ data: { email, addedBy: session.email } });
  revalidatePath("/admin/members");
  return { ok: true };
}

export async function removeAdminAction(formData: FormData): Promise<void> {
  await requireSuperAdmin("/admin/members");
  const id = formData.get("id");
  if (typeof id === "string") {
    await prisma.admin.delete({ where: { id } }).catch(() => {});
  }
  revalidatePath("/admin/members");
}
