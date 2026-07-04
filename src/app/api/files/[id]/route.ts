// 下載上傳檔：開放給任何 admin（全員共管問卷，回覆附件亦然）。
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/tpass-auth";
import { isAdmin } from "@/config/admin";
import { prisma } from "@/lib/db";
import { getObject } from "@/lib/storage";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const session = await getSession();
  if (!session || !(await isAdmin(session.email))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await getObject(upload.storageKey);
  if (!body) return NextResponse.json({ error: "gone" }, { status: 410 });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": upload.mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(upload.filename)}`,
    },
  });
}
