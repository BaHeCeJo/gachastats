import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    gameSlug: string;
    sectionId: string;
    entityId: string;
  }>;
};

export default async function EntityPage({ params }: Props) {
  const { entityId } = await params;

  const supabase = await createClient();

  // ------------------------------------------------
  // 1️⃣ Fetch entity (get section_id from DB)
  // ------------------------------------------------
  const { data: entity, error: entityError } = await supabase
    .from("section_entities")
    .select("*")
    .eq("id", entityId)
    .single();

  if (entityError || !entity) {
    return <div className="p-8">Entity not found</div>;
  }

  const realSectionId = entity.section_id;

  // ------------------------------------------------
  // 2️⃣ Fetch fields WITH relational data
  // ------------------------------------------------
  const { data: fields, error: fieldsError } = await supabase
    .from("section_fields")
    .select(`
      *,
      entity_field_values!left (
        id,
        entity_id,
        field_id,
        value_text,
        option_id
      ),
      field_options (
        id,
        field_id,
        display_name,
        order_index
      )
    `)
    .eq("section_id", realSectionId)
    .order("order_index", { ascending: true });

  if (fieldsError || !fields) {
    return <div className="p-8">Error loading fields</div>;
  }

  // ------------------------------------------------
  // 3️⃣ Render
  // ------------------------------------------------
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{entity.name}</h1>

      <form
        action={async (formData: FormData) => {
          "use server";

          const supabase = await createClient();

          for (const field of fields) {
            const fieldId = String(field.id);
            const key = `field_${fieldId}`;

            const rawValues = field.is_multi
              ? formData.getAll(key)
              : [formData.get(key)];

            const submittedValues = rawValues
              .filter((v) => v !== null && v !== "")
              .map((v) => v!.toString());

            // Delete existing
            await supabase
              .from("entity_field_values")
              .delete()
              .eq("entity_id", entityId)
              .eq("field_id", fieldId);

            // Insert new
            if (submittedValues.length > 0) {
              const rows = submittedValues.map((val) => ({
                entity_id: entityId,
                field_id: fieldId,
                value_text: field.manual_fill ? val : null,
                option_id: field.manual_fill ? null : val,
              }));

              await supabase
                .from("entity_field_values")
                .insert(rows);
            }
          }
        }}
        className="space-y-6"
      >
        {fields.map((field: any) => {
          // Only values for THIS entity
          const existingValues = (field.entity_field_values || []).filter(
            (v: any) => v.entity_id === entityId
          );

          let currentValue: any;

          if (field.manual_fill) {
            currentValue = field.is_multi
              ? existingValues.map((v: any) => v.value_text)
              : existingValues[0]?.value_text ?? "";
          } else {
            currentValue = field.is_multi
              ? existingValues.map((v: any) => String(v.option_id))
              : existingValues[0]?.option_id
              ? String(existingValues[0].option_id)
              : "";
          }

          return (
            <div key={field.id} className="space-y-2">
              <label className="block font-medium">
                {field.display_name}
              </label>

              {/* Manual single */}
              {field.manual_fill && !field.is_multi && (
                <input
                  name={`field_${field.id}`}
                  defaultValue={currentValue}
                  className="border p-2 w-full rounded"
                />
              )}

              {/* Manual multi */}
              {field.manual_fill && field.is_multi && (
                <>
                  {(currentValue?.length
                    ? currentValue
                    : [""]
                  ).map((v: string, index: number) => (
                    <input
                      key={index}
                      name={`field_${field.id}`}
                      defaultValue={v}
                      className="border p-2 w-full rounded mb-2"
                    />
                  ))}
                </>
              )}

              {/* Select single */}
              {!field.manual_fill && !field.is_multi && (
                <select
                  name={`field_${field.id}`}
                  defaultValue={currentValue}
                  className="border p-2 w-full rounded"
                >
                  <option value="">Select...</option>
                  {field.field_options
                    ?.sort(
                      (a: any, b: any) =>
                        a.order_index - b.order_index
                    )
                    .map((opt: any) => (
                      <option
                        key={opt.id}
                        value={String(opt.id)}
                      >
                        {opt.display_name}
                      </option>
                    ))}
                </select>
              )}

              {/* Select multi */}
              {!field.manual_fill && field.is_multi && (
                <div className="space-y-2">
                  {field.field_options
                    ?.sort(
                      (a: any, b: any) =>
                        a.order_index - b.order_index
                    )
                    .map((opt: any) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          name={`field_${field.id}`}
                          value={String(opt.id)}
                          defaultChecked={
                            Array.isArray(currentValue) &&
                            currentValue.includes(
                              String(opt.id)
                            )
                          }
                        />
                        {opt.display_name}
                      </label>
                    ))}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </form>
    </div>
  );
}
