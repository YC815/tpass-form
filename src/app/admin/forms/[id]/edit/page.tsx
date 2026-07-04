import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { getForm } from "@/lib/forms";
import { authConfig } from "@/config/auth";
import { FormBuilder } from "@/components/builder/FormBuilder";

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/admin/forms/${id}/edit`);
  const form = await getForm(id);
  if (!form) notFound();

  const publicUrl = new URL(`/f/${form.slug}`, authConfig.selfUrl).toString();

  return (
    <FormBuilder
      id={form.id}
      publicUrl={publicUrl}
      initialTitle={form.title}
      initialDescription={form.description}
      initialStatus={form.status}
      initialVersion={form.version}
      initialDefinition={form.definition}
      initialSettings={form.settings}
    />
  );
}
