import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Inbox } from "lucide-react";
import { canReadResponses, requireAdmin } from "@/lib/guard";
import { getForm, listResponses } from "@/lib/forms";
import { answerToText, questionBlocks } from "@/lib/answer-format";
import { gradeLabel } from "@/lib/grade";
import type { UploadedFile } from "@/components/fill/QuestionRenderer";
import type { QuestionBlock } from "@/lib/survey-schema";
import { Badge } from "@/components/ui/primitives";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/forms/${id}/responses`);
  const form = await getForm(id);
  // 回覆內容只有問卷建立者或超管可讀（M2）；對無權者以 404 呈現，不洩漏存在性。
  if (!form || !canReadResponses(session, form)) notFound();

  const responses = await listResponses(id);
  const questions = questionBlocks(form.definition.blocks);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href={`/admin/forms/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 回編輯
        </Link>
        <a
          href={`/api/forms/${id}/export`}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-foreground bg-card px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]"
        >
          <Download className="h-4 w-4" /> 匯出 CSV
        </a>
      </div>

      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="font-extrabold text-2xl tracking-tight">{form.title}</h1>
        <Badge className="bg-tone-green-badge">{responses.length} 份回覆</Badge>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-foreground/30 p-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-bold">還沒有人填寫</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {responses.map((r, idx) => (
            <li
              key={r.id}
              className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)]"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b-2 border-dashed border-foreground/15">
                <Badge>#{responses.length - idx}</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {r.submittedAt.toLocaleString("zh-TW")}
                </span>
                {r.respondentName && <Badge className="bg-tone-blue-badge">{r.respondentName}</Badge>}
                {r.respondentEmail && (
                  <Badge className="bg-tone-blue-badge">{r.respondentEmail}</Badge>
                )}
                {r.respondentGrade !== null && (
                  <Badge className="bg-tone-violet-badge">{gradeLabel(r.respondentGrade)}</Badge>
                )}
              </div>
              <dl className="flex flex-col gap-2.5">
                {questions.map((q) => (
                  <div key={q.id}>
                    <dt className="font-bold text-sm">{q.title || "（未命名題目）"}</dt>
                    <dd className="mt-0.5 font-medium text-muted-foreground">
                      <AnswerView q={q} value={r.answers[q.id]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnswerView({ q, value }: { q: QuestionBlock; value: unknown }) {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-foreground/40">—</span>;
  }
  if (q.type === "file_upload" && Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-2">
        {(value as UploadedFile[]).map((f) => (
          <a
            key={f.id}
            href={`/api/files/${f.id}`}
            className="inline-block rounded-md border-2 border-foreground bg-card px-2 py-0.5 font-mono text-xs font-bold text-accent hover:underline"
          >
            {f.name}
          </a>
        ))}
      </span>
    );
  }
  return <span className="whitespace-pre-wrap">{answerToText(q, value)}</span>;
}
