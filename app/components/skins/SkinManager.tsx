"use client";

import { useState, useActionState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import SkinImageInput from "../SkinImageInput"; // Assuming SkinImageInput is also updated to handle localization if needed
import { deleteSkin, upsertSkin, deleteSkinImage } from "./actions"; // Assuming upsertSkin is defined
import LocalizedTextInput from "../fields/LocalizedTextInput"; // For localized skin name input
import ConfirmButton from "../ConfirmButton";

// --- Type Definitions ---
type EntityData = {
  id: string;
  name: LocalizedString;
  icon_path: string | null;
  // Other entity properties as needed by SkinManager
};

type SkinImage = {
  id: string;
  type: string;
  image_path: string;
  publicUrl?: string; // Added for client-side rendering
};

type SkinData = {
  id: string;
  entity_id: string;
  name: LocalizedString;
  is_default: boolean;
  entity_images: SkinImage[];
};

type SkinManagerProps = {
  entity: EntityData;
  skins: SkinData[];
  gameSlug: string;
  sectionId: string;
  gameDefaultLang: string;
  activeLang: string;
};

type FormState = {
  error?: string;
};

export default function SkinManager({
  entity,
  skins,
  gameSlug,
  sectionId,
  gameDefaultLang,
  activeLang: browserLang,
}: SkinManagerProps) {
  const supabase = createClient();
  const { displayLang, t } = useLocalizationParams() as any;
  const activeLang = displayLang || browserLang;

  const entityId = entity.id;
  const [newSkinName, setNewSkinName] = useState<LocalizedString>({ [gameDefaultLang]: "" });

  const [addSkinState, addSkinAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("entity_id", entityId);
      formData.set("name", JSON.stringify(newSkinName));
      formData.set("is_default", skins.length === 0 ? "true" : "false"); // Set first skin as default

      const result = await upsertSkin(gameSlug, sectionId, entityId, gameDefaultLang, formData);

      if (result?.error) {
        return { ...prevState, error: result.error };
      }
      setNewSkinName({ [gameDefaultLang]: "" }); // Clear input on success
      return { ...prevState, error: undefined };
    },
    {} as FormState
  );

  async function deleteImageAction(imageId: string, imagePath: string) {
    // Client action to ensure client-side revalidation is handled
    await deleteSkinImage(imageId, imagePath, gameSlug, sectionId, entityId);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">{t('skins')}</h2>

      {addSkinState?.error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">
          {addSkinState.error}
        </div>
      )}

      <form action={addSkinAction} className="flex gap-2">
        <LocalizedTextInput
          id="new_skin_name"
          label={t('newSkin')}
          value={newSkinName}
          onChange={setNewSkinName}
          placeholder="e.g., Summer Outfit, Winter Cosplay"
          className="flex-grow"
        />
        <button
          type="submit"
          className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition self-end"
        >
          {t('addSkin')}
        </button>
      </form>

      <div className="space-y-4">
        {skins.map((skin) => {
          const icon = skin.entity_images.find((img: any) => img.type === 'icon');
          const splash = skin.entity_images.find((img: any) => img.type === 'splashart');

          return (
            <div key={skin.id} className="p-4 border border-zinc-700 rounded-xl bg-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">
                  {getTranslatedField(skin.name, activeLang, gameDefaultLang)} {skin.is_default && `(${t('default')})`}
                </h3>
                <div className="flex gap-2">
                  {!skin.is_default && (
                    <form action={async () => {
                      await upsertSkin(gameSlug, sectionId, entityId, gameDefaultLang, new FormData()); // Placeholder for setting default
                    }}>
                      <button className="text-xs bg-zinc-700 text-zinc-300 px-2 py-1 rounded hover:bg-zinc-600 transition">{t('setDefault')}</button>
                    </form>
                  )}
                  <form action={deleteSkin.bind(null, skin.id, entityId, gameSlug, sectionId)}>
                    <ConfirmButton buttonClassName="text-xs bg-red-700 text-white px-2 py-1 rounded hover:bg-red-600 transition">{t('deleteSkin')}</ConfirmButton>
                  </form>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-zinc-300">{t('icon')}</h4>
                  {icon?.publicUrl ? (
                    <div className="relative w-24 h-24">
                      <img
                        src={icon.publicUrl}
                        width={96}
                        height={96}
                        alt={getTranslatedField(skin.name, activeLang, gameDefaultLang) + ` ${t('icon')}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <ConfirmButton
                        action={deleteImageAction.bind(null, icon.id, icon.image_path)}
                        buttonClassName="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                        dialogMessage={t('deleteIconConfirm')}
                      >
                        X
                      </ConfirmButton>
                    </div>
                  ) : (
                    <SkinImageInput
                        entityId={entityId}
                        skinId={skin.id}
                        gameSlug={gameSlug}
                        sectionId={sectionId}
                        imageType="icon"
                        existingImageUrl={null}
                        gameDefaultLang={gameDefaultLang}
                        activeLang={activeLang}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-zinc-300">{t('fullArt')}</h4>
                  {splash?.publicUrl ? (
                    <div className="relative w-full">
                      <img
                        src={splash.publicUrl}
                        width={800}
                        alt={getTranslatedField(skin.name, activeLang, gameDefaultLang) + ` ${t('fullArt')}`}
                        className="w-full h-auto max-h-[500px] object-contain rounded-md"
                      />
                      <ConfirmButton
                        action={deleteImageAction.bind(null, splash.id, splash.image_path)}
                        buttonClassName="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                        dialogMessage={t('deleteFullArtConfirm')}
                      >
                        X
                      </ConfirmButton>
                    </div>
                  ) : (
                    <SkinImageInput
                        entityId={entityId}
                        skinId={skin.id}
                        gameSlug={gameSlug}
                        sectionId={sectionId}
                        imageType="splashart"
                        existingImageUrl={null}
                        gameDefaultLang={gameDefaultLang}
                        activeLang={activeLang}
                    />
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