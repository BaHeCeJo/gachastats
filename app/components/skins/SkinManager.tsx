import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import ImageInput from "../ImageInput";
import { deleteSkin } from "./actions";

type Props = {
  entity: any;
  skins: any[];
  gameSlug: string;
  sectionId: string;
};

export default function SkinManager({
  entity,
  skins,
  gameSlug,
  sectionId,
}: Props) {
  const entityId = entity.id;

  async function addSkin(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const skinName = formData.get("skin_name") as string;
    if (!skinName) return;

    const isFirstSkin = skins.length === 0;

    await supabase.from("entity_skins").insert([
      {
        entity_id: entityId,
        name: skinName,
        is_default: isFirstSkin,
      },
    ]);

    revalidatePath(
      `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`
    );
  }

  async function deleteImage(imageId: string, imagePath: string) {
    "use server";
    const supabase = await createClient();
    const path = imagePath.substring(imagePath.lastIndexOf(`/${entityId}/`));
    await supabase.storage.from("games").remove([path]);
    await supabase.from("entity_images").delete().eq("id", imageId);
    revalidatePath(
      `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Skins</h2>

      <form action={addSkin} className="flex gap-2">
        <input
          name="skin_name"
          placeholder="New skin name"
          className="border p-2 rounded w-full"
        />
        <button
          type="submit"
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Add Skin
        </button>
      </form>

      <div className="space-y-4">
        {skins.map((skin) => {
          const icon = skin.entity_images.find((img: any) => img.type === 'icon');
          const fullArt = skin.entity_images.find((img: any) => img.type === 'full_art');

          return (
            <div key={skin.id} className="p-4 border rounded">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">
                  {skin.name} {skin.is_default && "(Default)"}
                </h3>
                <div className="flex gap-2">
                  {!skin.is_default && (
                    <form action={async () => {
                      "use server";
                      const supabase = await createClient();
                      await supabase.from("entity_skins").update({ is_default: false }).eq("entity_id", entityId);
                      await supabase.from("entity_skins").update({ is_default: true }).eq("id", skin.id);
                      revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
                    }}>
                      <button className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Set as Default</button>
                    </form>
                  )}
                  <form action={deleteSkin.bind(null, skin.id, entityId, gameSlug, sectionId)}>
                    <button className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Delete Skin</button>
                  </form>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Icon</h4>
                  {icon ? (
                    <div className="relative w-24 h-24">
                      <img src={icon.image_path} alt="Icon" className="w-full h-full object-cover rounded" />
                      <form action={deleteImage.bind(null, icon.id, icon.image_path)}>
                        <button className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">X</button>
                      </form>
                    </div>
                  ) : (
                    <ImageInput entityId={entityId} skinId={skin.id} gameSlug={gameSlug} sectionId={sectionId} imageType="icon" />
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Full Art</h4>
                  {fullArt ? (
                    <div className="relative w-full">
                      <img src={fullArt.image_path} alt="Full Art" className="w-full h-auto object-contain rounded" />
                      <form action={deleteImage.bind(null, fullArt.id, fullArt.image_path)}>
                        <button className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">X</button>
                      </form>
                    </div>
                  ) : (
                    <ImageInput entityId={entityId} skinId={skin.id} gameSlug={gameSlug} sectionId={sectionId} imageType="full_art" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
