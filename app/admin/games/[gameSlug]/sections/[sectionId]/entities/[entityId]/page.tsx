import SkinManager from "@/app/components/skins/SkinManager";
import { createClient } from "@/lib/supabase/server";
import TagInput from "@/app/components/fields/TagInput";
import { deleteEntityAction } from "@/app/admin/games/actions";
import ConfirmButton from "@/app/components/ConfirmButton";

type Props = {
  params: Promise<{
    gameSlug: string;
    sectionId: string;
    entityId: string;
  }>;
};

export default async function EntityPage({ params }: Props) {
  const { gameSlug, sectionId, entityId } = await params;

  const supabase = await createClient();

  const { data: entityData, error: entityError } = await supabase
    .from("section_entities")
    .select(
      `
      *,
      entity_skins (
        *,
        entity_images (*)
      )
    `
    )
    .eq("id", entityId)
    .order("name", { foreignTable: "entity_skins", ascending: true })
    .single();

  if (entityError || !entityData) {
    return <div className="p-8">Entity not found</div>;
  }

  // Generate public URLs for all images
  for (const skin of entityData.entity_skins) {
    for (const image of skin.entity_images) {
      if (image.image_path && !image.image_path.startsWith("http")) {
        const { data } = supabase.storage
          .from("games")
          .getPublicUrl(image.image_path);
        image.image_path = data.publicUrl;
      }
    }
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("section_fields")
    .select(
      `
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
        value_key,
        order_index
      )
    `
    )
    .eq("section_id", entityData.section_id)
    .order("order_index", { ascending: true });

  if (fieldsError || !fields) {
    return <div className="p-8">Error loading fields</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{entityData.name}</h1>
        <form action={deleteEntityAction.bind(null, entityId, gameSlug, sectionId)}>
          <ConfirmButton>Delete Entity</ConfirmButton>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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

              await supabase
                .from("entity_field_values")
                .delete()
                .eq("entity_id", entityId)
                .eq("field_id", fieldId);

              if (submittedValues.length > 0) {
                const rows = submittedValues.map((val) => ({
                  entity_id: entityId,
                  field_id: fieldId,
                  value_text: field.manual_fill ? val : null,
                  option_id: field.manual_fill ? null : val,
                }));

                await supabase.from("entity_field_values").insert(rows);
              }
            }
          }}
          className="space-y-6"
        >
          {fields.map((field: any) => {
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
                  {field.key}
                </label>

                {/* Manual single */}
                {field.manual_fill && !field.is_multi && (
                  <input
                    name={`field_${field.id}`}
                    defaultValue={currentValue}
                    className="border p-2 w-full rounded"
                  />
                )}

                              {/* Manual multi (Tag Input) */}
                              {field.manual_fill && field.is_multi && (
                                <TagInput
                                  name={`field_${field.id}`}
                                  initialValues={currentValue}
                                />
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
                        (a: any, b: any) => a.order_index - b.order_index
                      )
                      .map((opt: any) => (
                        <option key={opt.id} value={String(opt.id)}>
                          {opt.value_key}
                        </option>
                      ))}
                  </select>
                )}

                {/* Select multi */}
                {!field.manual_fill && field.is_multi && (
                  <div className="space-y-2">
                    {field.field_options
                      ?.sort(
                        (a: any, b: any) => a.order_index - b.order_index
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
                              currentValue.includes(String(opt.id))
                            }
                          />
                          {opt.value_key}
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

        <SkinManager
          entity={entityData}
          skins={entityData.entity_skins}
          gameSlug={gameSlug}
          sectionId={sectionId}
        />
      </div>
    </div>
  );
}
