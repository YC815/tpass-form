"use server";

// 後台表單操作（server actions）。每個都自帶 requireAdmin + 擁有者檢查——
// server actions 可被直接 POST，授權一定要在函式內做。
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import {
  createDraft,
  saveDraft,
  setStatus,
  deleteForm,
  getOwnedForm,
  type DraftPatch,
} from "@/lib/forms";
import { validateFormStructure } from "@/lib/survey-schema";

export async function createFormAction(): Promise<void> {
  const session = await requireAdmin();
  const id = await createDraft({ sub: session.sub, email: session.email });
  redirect(`/admin/forms/${id}/edit`);
}

export interface SaveResult {
  ok: boolean;
  savedAt: number;
  error?: string;
}

export async function saveFormAction(id: string, patch: DraftPatch): Promise<SaveResult> {
  const session = await requireAdmin();
  try {
    await saveDraft(id, session.sub, patch);
    return { ok: true, savedAt: Date.now() };
  } catch {
    return { ok: false, savedAt: Date.now(), error: "儲存失敗" };
  }
}

export interface PublishResult {
  ok: boolean;
  errors?: string[];
}

export async function publishFormAction(id: string): Promise<PublishResult> {
  const session = await requireAdmin();
  const form = await getOwnedForm(id, session.sub);
  if (!form) return { ok: false, errors: ["找不到問卷或你不是擁有者。"] };

  const errors = validateFormStructure(form.definition);
  if (errors.length > 0) return { ok: false, errors };

  await setStatus(id, session.sub, "published");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function closeFormAction(id: string): Promise<void> {
  const session = await requireAdmin();
  await setStatus(id, session.sub, "closed");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function reopenFormAction(id: string): Promise<void> {
  const session = await requireAdmin();
  await setStatus(id, session.sub, "published");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteFormAction(id: string): Promise<void> {
  const session = await requireAdmin();
  await deleteForm(id, session.sub);
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}
