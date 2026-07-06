"use server";

// 送出問卷。身分一律由伺服器從驗章後的 session 戳記（client 傳的身分一概不信）。
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { authConfig } from "@/config/auth";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { getPublicForm } from "@/lib/forms";
import { validateAnswers, type AnswerMap } from "@/lib/answers";
import { deriveGrade } from "@/lib/grade";

export interface SubmitResult {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
}

export async function submitFormAction(
  slug: string,
  answers: AnswerMap,
): Promise<SubmitResult> {
  const session = await requireSession(`/f/${slug}`);
  const form = await getPublicForm(slug);

  if (!form || form.status !== "published" || !form.settings.acceptingResponses) {
    return { ok: false, message: "這份問卷目前沒有開放填寫。" };
  }

  const fieldErrors = validateAnswers(form.definition, answers);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, errors: fieldErrors, message: "有題目尚未完成。" };
  }

  const { anonymous, identityFields, oneResponsePerUser } = form.settings;

  // 身分戳記（只在非匿名時，且只記設計者勾選的欄位）。
  const stamp = {
    respondentSub: null as string | null,
    anonHash: null as string | null,
    respondentName: null as string | null,
    respondentEmail: null as string | null,
    respondentGrade: null as number | null,
  };

  if (!anonymous) {
    if (identityFields.includes("name")) stamp.respondentName = session.name;
    if (identityFields.includes("email")) stamp.respondentEmail = session.email;
    if (identityFields.includes("grade")) stamp.respondentGrade = deriveGrade(session.email);
  }

  // 防重複 key（與身分顯示分離）：
  if (oneResponsePerUser) {
    if (anonymous) {
      // secret 在 config REQUIRED 裡強制存在（M1：空 secret 會讓匿名雜湊可被反解）。
      stamp.anonHash = createHash("sha256")
        .update(`${session.sub}:${form.id}:${authConfig.anonHashSecret}`)
        .digest("hex");
    } else {
      stamp.respondentSub = session.sub;
    }
  }

  try {
    await prisma.response.create({
      data: {
        formId: form.id,
        answers: answers as Prisma.InputJsonValue,
        ...stamp,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, message: "你已經填過這份問卷了。" };
    }
    throw e;
  }

  return { ok: true };
}
