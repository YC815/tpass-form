"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  CircleHelp,
  SquareSplitVertical,
  Type as TypeIcon,
  Send,
  Lock,
  Trash2,
} from "lucide-react";
import {
  type Block,
  type FormDefinition,
  type FormSettings,
  createQuestion,
  createSection,
  createText,
  newId,
} from "@/lib/survey-schema";
import type { FormStatus } from "@/lib/forms";
import { Button, Input, Textarea, Badge } from "@/components/ui/primitives";
import { SortableBlock } from "./SortableBlock";
import { SettingsPanel } from "./SettingsPanel";
import { CopyLinkButton } from "@/components/common/CopyLinkButton";
import {
  saveFormAction,
  publishFormAction,
  closeFormAction,
  reopenFormAction,
  deleteFormAction,
} from "@/app/admin/forms/actions";

interface Props {
  id: string;
  publicUrl: string;
  initialTitle: string;
  initialDescription: string | null;
  initialStatus: FormStatus;
  initialDefinition: FormDefinition;
  initialSettings: FormSettings;
}

type SaveState = "saved" | "saving" | "unsaved" | "error";

export function FormBuilder(props: Props) {
  const [title, setTitle] = React.useState(props.initialTitle);
  const [description, setDescription] = React.useState(props.initialDescription ?? "");
  const [def, setDef] = React.useState<FormDefinition>(props.initialDefinition);
  const [settings, setSettings] = React.useState<FormSettings>(props.initialSettings);
  const [status, setStatus] = React.useState<FormStatus>(props.initialStatus);
  const [saveState, setSaveState] = React.useState<SaveState>("saved");
  const [publishErrors, setPublishErrors] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // 段落清單（供跳轉下拉用）。
  const sections = React.useMemo(
    () =>
      def.blocks
        .filter((b) => b.kind === "section")
        .map((b) => ({ id: b.id, title: (b.title as string) || "未命名區段" })),
    [def.blocks],
  );

  // ── 自動存草稿（debounce）──────────────────────────────────────────
  const stateRef = React.useRef({ title, description, def, settings });
  React.useEffect(() => {
    stateRef.current = { title, description, def, settings };
  });
  const firstRender = React.useRef(true);

  const flushSave = React.useCallback(async () => {
    const s = stateRef.current;
    setSaveState("saving");
    const res = await saveFormAction(props.id, {
      title: s.title,
      description: s.description,
      definition: s.def,
      settings: s.settings,
    });
    setSaveState(res.ok ? "saved" : "error");
  }, [props.id]);

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("unsaved");
    const t = setTimeout(() => {
      void flushSave();
    }, 800);
    return () => clearTimeout(t);
  }, [title, description, def, settings, flushSave]);

  // ── block 操作 ─────────────────────────────────────────────────────
  const updateBlock = (next: Block) =>
    setDef((d) => ({ blocks: d.blocks.map((b) => (b.id === next.id ? next : b)) }));

  const deleteBlock = (id: string) =>
    setDef((d) => ({ blocks: d.blocks.filter((b) => b.id !== id) }));

  const duplicateBlock = (id: string) =>
    setDef((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      if (i < 0) return d;
      const src = d.blocks[i];
      const copy = { ...src, id: newId(src.kind[0]) } as Block;
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, copy);
      return { blocks };
    });

  const addBlock = (b: Block) => setDef((d) => ({ blocks: [...d.blocks, b] }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDef((d) => {
      const from = d.blocks.findIndex((b) => b.id === active.id);
      const to = d.blocks.findIndex((b) => b.id === over.id);
      if (from < 0 || to < 0) return d;
      return { blocks: arrayMove(d.blocks, from, to) };
    });
  };

  // ── 發布 / 關閉 / 刪除 ─────────────────────────────────────────────
  const onPublish = () =>
    startTransition(async () => {
      await flushSave();
      const res = await publishFormAction(props.id);
      if (res.ok) {
        setPublishErrors([]);
        setStatus("published");
      } else {
        setPublishErrors(res.errors ?? ["發布失敗"]);
      }
    });

  const onClose = () =>
    startTransition(async () => {
      await closeFormAction(props.id);
      setStatus("closed");
    });

  const onReopen = () =>
    startTransition(async () => {
      await reopenFormAction(props.id);
      setStatus("published");
    });

  const onDelete = () =>
    startTransition(async () => {
      await deleteFormAction(props.id);
    });

  return (
    <div>
      {/* 工具列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 返回
        </Link>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} />
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 主畫布 */}
        <div className="flex-1 min-w-0">
          {/* 表單抬頭 */}
          <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)] mb-4">
            <Input
              value={title}
              placeholder="問卷標題"
              className="text-xl font-extrabold border-0 shadow-none px-0 focus:shadow-none"
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              value={description}
              placeholder="問卷說明（選填）"
              className="mt-2 border-0 shadow-none px-0 focus:shadow-none min-h-12"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={def.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-4">
                {def.blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    sections={sections}
                    onChange={updateBlock}
                    onDuplicate={() => duplicateBlock(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* 新增 block */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => addBlock(createQuestion("short_text"))}>
              <CircleHelp className="h-4 w-4" /> 新增題目
            </Button>
            <Button type="button" variant="default" onClick={() => addBlock(createSection())}>
              <SquareSplitVertical className="h-4 w-4" /> 新增區段
            </Button>
            <Button type="button" variant="default" onClick={() => addBlock(createText())}>
              <TypeIcon className="h-4 w-4" /> 新增文字
            </Button>
          </div>
        </div>

        {/* 側欄：設定 + 發布 */}
        <aside className="lg:w-80 shrink-0 flex flex-col gap-4">
          <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>

          <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)] flex flex-col gap-3">
            <h2 className="font-extrabold text-lg">發布</h2>

            {status !== "draft" && (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[11px] font-bold text-muted-foreground break-all">
                  {props.publicUrl}
                </p>
                <CopyLinkButton url={props.publicUrl} variant="default" />
              </div>
            )}

            {publishErrors.length > 0 && (
              <ul className="rounded-xl border-2 border-destructive bg-destructive/10 p-3 text-sm font-medium text-foreground flex flex-col gap-1">
                {publishErrors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            )}

            {status === "draft" && (
              <Button type="button" variant="primary" disabled={pending} onClick={onPublish}>
                <Send className="h-4 w-4" /> 發布問卷
              </Button>
            )}
            {status === "published" && (
              <Button type="button" variant="default" disabled={pending} onClick={onClose}>
                <Lock className="h-4 w-4" /> 停止收件
              </Button>
            )}
            {status === "closed" && (
              <Button type="button" variant="primary" disabled={pending} onClick={onReopen}>
                <Send className="h-4 w-4" /> 重新開放
              </Button>
            )}
            {status !== "draft" && (
              <Link
                href={`/admin/forms/${props.id}/responses`}
                className="text-center text-sm font-bold text-accent hover:underline"
              >
                查看回應 →
              </Link>
            )}

            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> 刪除問卷
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const map: Record<SaveState, string> = {
    saved: "已儲存",
    saving: "儲存中…",
    unsaved: "未儲存",
    error: "儲存失敗",
  };
  return (
    <span className="font-mono text-[11px] font-bold text-muted-foreground">{map[state]}</span>
  );
}

function StatusBadge({ status }: { status: FormStatus }) {
  const map: Record<FormStatus, { label: string; cls: string }> = {
    draft: { label: "草稿", cls: "bg-card" },
    published: { label: "已發布", cls: "bg-tone-green-badge" },
    closed: { label: "已關閉", cls: "bg-tone-rose-badge" },
  };
  return <Badge className={map[status].cls}>{map[status].label}</Badge>;
}
