import SkinManager from "@/app/components/skins/SkinManager";
import { createClient } from "@/lib/supabase/server";
import TagInput from "@/app/components/fields/TagInput";
import CreatableTagInput from "@/app/components/fields/CreatableTagInput";
import { deleteEntityAction } from "@/app/admin/games/actions";
import ConfirmButton from "@/app/components/ConfirmButton";
import { revalidatePath } from "next/cache";

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
      if (image.image_path) {
        if (image.image_path.startsWith("http")) {
            (image as any).publicUrl = image.image_path;
        } else {
            const { data } = supabase.storage
            .from("games")
            .getPublicUrl(image.image_path);
            (image as any).publicUrl = data.publicUrl;
        }
      }
    }
  }

  const { data: allFields, error: fieldsError } = await supabase
    .from("section_fields")
    .select(
      `
      *,
      entity_field_values (
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

  if (fieldsError || !allFields) {
    return <div className="p-8">Error loading fields</div>;
  }

  // Deduplicate fields by ID to ensure we don't render or process the same field multiple times
  const uniqueFieldsMap = new Map();
  allFields.forEach(field => {
    if (!uniqueFieldsMap.has(field.id)) {
      uniqueFieldsMap.set(field.id, {
        ...field,
        entity_field_values: (field.entity_field_values || []).filter((v: any) => v.entity_id === entityId)
      });
    }
  });
  const fields = Array.from(uniqueFieldsMap.values());

  // Group fields by category and sort them
  const groupedFields: Record<string, typeof fields> = {};
  fields.forEach((field) => {
    const cat = field.category || "General";
    if (!groupedFields[cat]) groupedFields[cat] = [];
    groupedFields[cat]!.push(field);
  });

  // Sort categories by the minimum order_index of their fields
  const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
    const minA = Math.min(...groupedFields[a]!.map((f) => f.order_index || 0));
    const minB = Math.min(...groupedFields[b]!.map((f) => f.order_index || 0));
    if (minA !== minB) return minA - minB;
    return a.localeCompare(b);
  });

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
            const allRows: any[] = [];

            for (const field of fields) {
              const fieldId = String(field.id);
              const key = `field_${fieldId}`;

              const rawValues = field.is_multi
                ? formData.getAll(key)
                : [formData.get(key)];

              const submittedValues = rawValues
                .filter((v) => v !== null && v !== "")
                .map((v) => v!.toString());

              if (submittedValues.length > 0) {
                if (field.manual_fill) {
                  // NEW LOGIC: Hybrid "Manual Fill" (Creatable Options)
                  const resolvedOptionIds: string[] = [];

                  for (const valueLabel of submittedValues) {
                    // 1. Check if the value matches an existing option (by label)
                    const existingOpt = (field.field_options || []).find(
                      (opt: any) => opt.value_key.toLowerCase() === valueLabel.toLowerCase()
                    );

                    if (existingOpt) {
                      resolvedOptionIds.push(String(existingOpt.id));
                    } else {
                      // 2. If it's a new label, create the option in field_options
                      const { data: newOpt, error: optError } = await supabase
                        .from("field_options")
                        .insert({
                          field_id: fieldId,
                          value_key: valueLabel,
                        })
                        .select()
                        .single();

                      if (optError) {
                        console.error("Error creating option:", optError.message);
                      } else if (newOpt) {
                        resolvedOptionIds.push(String(newOpt.id));
                      }
                    }
                  }

                  if (field.is_multi) {
                    // Store multiple option IDs as comma-separated string in value_text
                    allRows.push({
                      entity_id: entityId,
                      field_id: fieldId,
                      value_text: resolvedOptionIds.join(','),
                      option_id: null,
                    });
                  } else {
                    // Store single option ID
                    allRows.push({
                      entity_id: entityId,
                      field_id: fieldId,
                      value_text: null,
                      option_id: resolvedOptionIds[0],
                    });
                  }
                } else {
                  // Normal Predetermined Fields (Dropdown/Checkbox)
                  if (field.is_multi) {
                    allRows.push({
                      entity_id: entityId,
                      field_id: fieldId,
                      value_text: submittedValues.join(','),
                      option_id: null,
                    });
                  } else {
                    const val = submittedValues[0];
                    allRows.push({
                      entity_id: entityId,
                      field_id: fieldId,
                      value_text: null,
                      option_id: val,
                    });
                  }
                }
              }
            }

            // Perform an atomic-like operation: Delete all existing values for this entity and insert new ones
            const { error: deleteError } = await supabase
              .from("entity_field_values")
              .delete()
              .eq("entity_id", entityId);

            if (deleteError) {
              console.error("Delete error:", deleteError.message);
              return;
            }

            if (allRows.length > 0) {
              const { error: insertError } = await supabase
                .from("entity_field_values")
                .insert(allRows);
              
              if (insertError) {
                console.error("Insert error:", insertError.message);
              }
            }

            revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
          }}
          className="space-y-6"
        >
          {sortedCategories.map((category) => (
            <div key={category} className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800 pb-1">
                {category}
              </h3>
              <div className="space-y-4 ml-2">
                {groupedFields[category]!.map((field: any) => {
                  const existingValues = (field.entity_field_values || []).filter(
                    (v: any) => v.entity_id === entityId
                  );

                  let currentValue: any;

                  if (field.is_multi) {
                    // For multi-select, we store IDs as comma-separated string in value_text
                    const rawValue = existingValues[0]?.value_text || "";
                    const ids = rawValue ? rawValue.split(',') : [];
                    
                    if (field.manual_fill) {
                      // Resolve IDs to labels for the TagInput
                      currentValue = ids.map((id: string) => {
                        const opt = (field.field_options || []).find((o: any) => String(o.id) === id);
                        return opt ? opt.value_key : id;
                      });
                    } else {
                      currentValue = ids;
                    }
                  } else {
                    if (field.manual_fill) {
                      // Resolve single ID/Value to label if it's an option_id
                      if (existingValues[0]?.option_id) {
                        const opt = (field.field_options || []).find((o: any) => String(o.id) === String(existingValues[0].option_id));
                        currentValue = opt ? opt.value_key : existingValues[0].value_text;
                      } else {
                        currentValue = existingValues[0]?.value_text ?? "";
                      }
                    } else {
                      currentValue = existingValues[0]?.option_id
                        ? String(existingValues[0].option_id)
                        : "";
                    }
                  }

                  return (
                    <div key={field.id} className="space-y-2">
                      <label className="block font-medium">
                        {field.key}
                      </label>

                      {/* Manual single (Hybrid: types new or uses existing) */}
                      {field.manual_fill && !field.is_multi && (
                        <div className="space-y-1">
                          <input
                            name={`field_${field.id}`}
                            defaultValue={currentValue}
                            list={`list_${field.id}`}
                            className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:ring-2 focus:ring-indigo-500"
                            placeholder="Type new or select existing..."
                          />
                          <datalist id={`list_${field.id}`}>
                            {field.field_options?.map((opt: any) => (
                              <option key={opt.id} value={opt.value_key} />
                            ))}
                          </datalist>
                        </div>
                      )}

                      {/* Manual multi (Creatable Tag Input) */}
                      {field.manual_fill && field.is_multi && (
                        <CreatableTagInput
                          key={`field_${field.id}_${currentValue.join(',')}`}
                          name={`field_${field.id}`}
                          initialValues={currentValue}
                          options={field.field_options}
                        />
                      )}
                      {/* Select single */}
                      {!field.manual_fill && !field.is_multi && (
                        <select
                          name={`field_${field.id}`}
                          defaultValue={currentValue}
                          className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="" className="bg-gray-800 text-white">Select...</option>
                          {field.field_options
                            ?.sort(
                              (a: any, b: any) => a.order_index - b.order_index
                            )
                            .map((opt: any) => (
                              <option key={opt.id} value={String(opt.id)} className="bg-gray-800 text-white">
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
              </div>
            </div>
          ))}
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
