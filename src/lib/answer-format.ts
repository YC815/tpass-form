// 把答案值轉成人話字串（結果頁 + CSV 匯出共用）。檔案題回傳檔名串；連結由 UI 端另接。
import type { QuestionBlock } from "@/lib/survey-schema";
import type { UploadedFile } from "@/components/fill/QuestionRenderer";

export function answerToText(q: QuestionBlock, value: unknown): string {
  if (value === undefined || value === null) return "";

  switch (q.type) {
    case "short_text":
    case "paragraph":
    case "date":
      return typeof value === "string" ? value : "";
    case "single_choice":
    case "dropdown":
      return q.options?.find((o) => o.id === value)?.label ?? "";
    case "multi_choice": {
      if (!Array.isArray(value)) return "";
      const byId = new Map(q.options?.map((o) => [o.id, o.label]));
      return value.map((v) => byId.get(v as string) ?? "").filter(Boolean).join("、");
    }
    case "linear_scale":
      return String(value);
    case "grid_single": {
      const map = (value as Record<string, string>) ?? {};
      const colLabel = new Map(q.grid?.cols.map((c) => [c.id, c.label]));
      return (q.grid?.rows ?? [])
        .map((r) => `${r.label}：${colLabel.get(map[r.id]) ?? "—"}`)
        .join("　");
    }
    case "grid_multi": {
      const map = (value as Record<string, string[]>) ?? {};
      const colLabel = new Map(q.grid?.cols.map((c) => [c.id, c.label]));
      return (q.grid?.rows ?? [])
        .map(
          (r) =>
            `${r.label}：${(map[r.id] ?? []).map((c) => colLabel.get(c) ?? "").filter(Boolean).join("/")}`,
        )
        .join("　");
    }
    case "file_upload": {
      if (!Array.isArray(value)) return "";
      return (value as UploadedFile[]).map((f) => f.name).join("、");
    }
    default:
      return "";
  }
}

// 取出某題在所有 question blocks 中的順序清單。
export function questionBlocks(blocks: { kind: string }[]): QuestionBlock[] {
  return blocks.filter((b): b is QuestionBlock => b.kind === "question");
}
