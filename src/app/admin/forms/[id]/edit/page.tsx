import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { getOwnedForm } from "@/lib/forms";
import { authConfig } from "@/config/auth";
import { FormBuilder } from "@/components/builder/FormBuilder";

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/forms/${id}/edit`);
  const form = await getOwnedForm(id, session.sub);
  if (!form) notFound();

  const publicUrl = new URL(`/f/${form.slug}`, authConfig.selfUrl).toString();

  return (
    <FormBuilder
      id={form.id}
      publicUrl={publicUrl}
      initialTitle={form.title}
      initialDescription={form.description}
      initialStatus={form.status}
      initialDefinition={form.definition}
      initialSettings={form.settings}
    />
  );
}
