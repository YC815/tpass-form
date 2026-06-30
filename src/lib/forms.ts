// 表單 CRUD（server-only）。真相來源 = Postgres；definition/settings 存 jsonb，
// 讀寫都過 zod，套用預設並擋掉壞資料。
import "server-only";
import { customAlphabet } from "nanoid";
import type { Form } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  formDefinitionSchema,
  formSettingsSchema,
  emptyForm,
  type FormDefinition,
  type FormSettings,
} from "@/lib/survey-schema";

const slugId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export type FormStatus = "draft" | "published" | "closed";

export interface FormView {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: FormStatus;
  ownerSub: string;
  ownerEmail: string;
  definition: FormDefinition;
  settings: FormSettings;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

// 把 Prisma row 轉成型別安全的 view（jsonb → 過 zod）。
export function toView(form: Form): FormView {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    status: form.status as FormStatus,
    ownerSub: form.ownerSub,
    ownerEmail: form.ownerEmail,
    definition: formDefinitionSchema.parse(form.definition),
    settings: formSettingsSchema.parse(form.settings),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    publishedAt: form.publishedAt,
  };
}

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const slug = slugId();
    const hit = await prisma.form.findUnique({ where: { slug }, select: { id: true } });
    if (!hit) return slug;
  }
  return `${slugId()}${slugId()}`;
}

export async function createDraft(owner: { sub: string; email: string }): Promise<string> {
  const slug = await uniqueSlug();
  const form = await prisma.form.create({
    data: {
      slug,
      title: "未命名問卷",
      status: "draft",
      ownerSub: owner.sub,
      ownerEmail: owner.email,
      definition: emptyForm(),
      settings: formSettingsSchema.parse({}),
    },
    select: { id: true },
  });
  return form.id;
}

export async function getOwnedForm(id: string, ownerSub: string): Promise<FormView | null> {
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form || form.ownerSub !== ownerSub) return null;
  return toView(form);
}

export async function getPublicForm(slug: string): Promise<FormView | null> {
  const form = await prisma.form.findUnique({ where: { slug } });
  if (!form) return null;
  return toView(form);
}

export async function listOwnedForms(ownerSub: string): Promise<FormView[]> {
  const forms = await prisma.form.findMany({
    where: { ownerSub },
    orderBy: { updatedAt: "desc" },
  });
  return forms.map(toView);
}

export async function listPublishedForms(): Promise<FormView[]> {
  const forms = await prisma.form.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
  });
  return forms.map(toView);
}

export interface DraftPatch {
  title?: string;
  description?: string | null;
  definition?: unknown;
  settings?: unknown;
}

export async function saveDraft(id: string, ownerSub: string, patch: DraftPatch): Promise<void> {
  const owned = await prisma.form.findUnique({
    where: { id },
    select: { ownerSub: true },
  });
  if (!owned || owned.ownerSub !== ownerSub) throw new Error("not found or not owner");

  await prisma.form.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.definition !== undefined
        ? { definition: formDefinitionSchema.parse(patch.definition) }
        : {}),
      ...(patch.settings !== undefined
        ? { settings: formSettingsSchema.parse(patch.settings) }
        : {}),
    },
  });
}

export async function setStatus(
  id: string,
  ownerSub: string,
  status: FormStatus,
): Promise<void> {
  const owned = await prisma.form.findUnique({
    where: { id },
    select: { ownerSub: true, publishedAt: true },
  });
  if (!owned || owned.ownerSub !== ownerSub) throw new Error("not found or not owner");
  await prisma.form.update({
    where: { id },
    data: {
      status,
      ...(status === "published" && !owned.publishedAt
        ? { publishedAt: new Date() }
        : {}),
    },
  });
}

export interface ResponseRow {
  id: string;
  submittedAt: Date;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentGrade: number | null;
  answers: Record<string, unknown>;
}

// 列出某問卷的回覆（限擁有者）。
export async function listResponses(
  id: string,
  ownerSub: string,
): Promise<ResponseRow[]> {
  const owned = await prisma.form.findUnique({
    where: { id },
    select: { ownerSub: true },
  });
  if (!owned || owned.ownerSub !== ownerSub) throw new Error("not found or not owner");

  const rows = await prisma.response.findMany({
    where: { formId: id },
    orderBy: { submittedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    submittedAt: r.submittedAt,
    respondentName: r.respondentName,
    respondentEmail: r.respondentEmail,
    respondentGrade: r.respondentGrade,
    answers: (r.answers as Record<string, unknown>) ?? {},
  }));
}

export async function deleteForm(id: string, ownerSub: string): Promise<void> {
  const owned = await prisma.form.findUnique({
    where: { id },
    select: { ownerSub: true },
  });
  if (!owned || owned.ownerSub !== ownerSub) throw new Error("not found or not owner");
  await prisma.form.delete({ where: { id } });
}
