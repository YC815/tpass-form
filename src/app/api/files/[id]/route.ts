// 下載上傳檔：只開放給「該檔所屬問卷的擁有者」（即建立者）。
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/tpass-auth";
import { prisma } from "@/lib/db";
import { getObject } from "@/lib/storage";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await prisma.form.findUnique({
    where: { id: upload.formId },
    select: { ownerSub: true },
  });
  if (!form || form.ownerSub !== session.sub) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await getObject(upload.storageKey);
  if (!body) return NextResponse.json({ error: "gone" }, { status: 410 });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": upload.mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(upload.filename)}`,
    },
  });
}
