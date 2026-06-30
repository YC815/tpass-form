// 檔案上傳端點：填寫者上傳前先打這裡拿 upload id，再把 id 帶進答案。
// 一律驗 session、檢查目標題確實是該問卷的 file_upload 題、擋超大檔。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/tpass-auth";
import { prisma } from "@/lib/db";
import { formDefinitionSchema } from "@/lib/survey-schema";
import { newStorageKey, putObject } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const formId = form.get("formId");
  const questionId = form.get("questionId");

  if (!(file instanceof File) || typeof formId !== "string" || typeof questionId !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const dbForm = await prisma.form.findUnique({ where: { id: formId } });
  if (!dbForm || dbForm.status !== "published") {
    return NextResponse.json({ error: "form not open" }, { status: 404 });
  }

  const def = formDefinitionSchema.parse(dbForm.definition);
  const q = def.blocks.find(
    (b) => b.kind === "question" && b.id === questionId && b.type === "file_upload",
  );
  if (!q || q.kind !== "question") {
    return NextResponse.json({ error: "no such file question" }, { status: 400 });
  }

  const maxBytes = (q.file?.maxSizeMB ?? 10) * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = newStorageKey();
  await putObject(storageKey, buffer, file.type || "application/octet-stream");

  const upload = await prisma.upload.create({
    data: {
      formId,
      questionId,
      storageKey,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      uploaderSub: session.sub,
    },
    select: { id: true, filename: true },
  });

  return NextResponse.json({ id: upload.id, filename: upload.filename });
}
