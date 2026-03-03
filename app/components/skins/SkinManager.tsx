"use client";

import { useState, useActionState } from "react";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import SkinImageInput from "../SkinImageInput";
import { deleteSkin, upsertSkin, deleteSkinImage } from "./actions";
import LocalizedTextInput from "../fields/LocalizedTextInput";
import ConfirmButton from "../ConfirmButton";
import { Edit2, Check, X as CloseIcon } from "lucide-react";
import Image from "next/image";

// --- Type Definitions ---
type EntityData = {
  id: string;
  name: LocalizedString;
  icon_path: string | null;
};

type SkinImage = {
  id: string;
  type: string;
  image_path: string;
  publicUrl?: string;
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
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const entityId = entity.id;
  const [newSkinName, setNewSkinName] = useState<LocalizedString>({ [gameDefaultLang]: "" });
  const [editingSkinId, setEditingSkinId] = useState<string | null>(null);
  const [editingSkinName, setEditingSkinName] = useState<LocalizedString>({});

  const [addSkinState, addSkinAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("entity_id", entityId);
      formData.set("name", JSON.stringify(newSkinName));
      formData.set("is_default", skins.length === 0 ? "true" : "false");

      const result = await upsertSkin(gameSlug, sectionId, entityId, gameDefaultLang, formData);

      if (result?.error) return { ...prevState, error: result.error };
      setNewSkinName({ [gameDefaultLang]: "" });
      return { ...prevState, error: undefined };
    },
    {} as FormState
  );

  const [editSkinState, editSkinAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      if (!editingSkinId) return prevState;
      formData.set("id", editingSkinId);
      formData.set("entity_id", entityId);
      formData.set("name", JSON.stringify(editingSkinName));
      // Keep existing default status
      const skin = skins.find(s => s.id === editingSkinId);
      formData.set("is_default", skin?.is_default ? "true" : "false");

      const result = await upsertSkin(gameSlug, sectionId, entityId, gameDefaultLang, formData);

      if (result?.error) return { ...prevState, error: result.error };
      setEditingSkinId(null);
      return { ...prevState, error: undefined };
    },
    {} as FormState
  );

  async function deleteImageAction(imageId: string, imagePath: string) {
    await deleteSkinImage(imageId, imagePath, gameSlug, sectionId, entityId);
  }

  const startEditing = (skin: SkinData) => {
    setEditingSkinId(skin.id);
    setEditingSkinName(skin.name);
  };

  return (
    <div className="space-y-6 mt-12 pt-12 border-t border-zinc-800">
      <h2 className="text-xl font-bold text-white italic flex items-center gap-2">
        <span className="w-4 h-1 bg-blue-500"></span>
        {t('skins')}
      </h2>

      {(addSkinState?.error || editSkinState?.error) && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">
          {addSkinState?.error || editSkinState?.error}
        </div>
      )}

      <form action={addSkinAction} className="flex gap-2 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
        <LocalizedTextInput
          id="new_skin_name"
          label={t('newSkin')}
          value={newSkinName}
          onChange={setNewSkinName}
          placeholder="e.g., Summer Outfit"
          className="flex-grow"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-blue-500 transition self-end h-[42px]"
        >
          {t('addSkin')}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6">
        {skins.map((skin) => {
          const icon = skin.entity_images.find((img) => img.type === 'icon');
          const splash = skin.entity_images.find((img) => img.type === 'splashart');
          const isEditing = editingSkinId === skin.id;

          return (
            <div key={skin.id} className="p-6 border border-zinc-800 rounded-3xl bg-zinc-900/30 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex-grow max-w-md">
                  {isEditing ? (
                    <form action={editSkinAction} className="space-y-3">
                      <LocalizedTextInput
                        id={`edit_name_${skin.id}`}
                        label={t('skinName')}
                        value={editingSkinName}
                        onChange={setEditingSkinName}
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-500"><Check size={14}/> Save</button>
                        <button type="button" onClick={() => setEditingSkinId(null)} className="flex items-center gap-1 bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-600"><CloseIcon size={14}/> Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h3 className="font-black text-xl text-white uppercase italic tracking-wider">
                        {getTranslatedField(skin.name, activeLang, gameDefaultLang)} 
                        {skin.is_default && <span className="ml-2 text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full not-italic tracking-normal">DEFAULT</span>}
                      </h3>
                      <button onClick={() => startEditing(skin)} className="text-zinc-500 hover:text-white transition"><Edit2 size={16}/></button>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {!skin.is_default && (
                    <form action={async () => {
                      const fd = new FormData();
                      fd.set("id", skin.id);
                      fd.set("name", JSON.stringify(skin.name));
                      fd.set("is_default", "true");
                      await upsertSkin(gameSlug, sectionId, entityId, gameDefaultLang, fd);
                    }}>
                      <button className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-xl hover:bg-zinc-700 hover:text-white transition uppercase tracking-widest border border-zinc-700">Set Default</button>
                    </form>
                  )}
                  <form action={deleteSkin.bind(null, skin.id, entityId, gameSlug, sectionId)}>
                    <ConfirmButton buttonClassName="text-[10px] font-bold bg-red-950/30 text-red-500 px-3 py-1.5 rounded-xl hover:bg-red-900/50 transition uppercase tracking-widest border border-red-900/30">{t('delete')}</ConfirmButton>
                  </form>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{t('icon')}</label>
                  {icon?.publicUrl ? (
                    <div className="relative w-32 h-32 group">
                      <Image
                        src={icon.publicUrl}
                        alt="Icon"
                        fill
                        sizes="128px"
                        className="object-cover rounded-2xl border-2 border-zinc-800 bg-black shadow-xl"
                      />
                      <ConfirmButton
                        action={deleteImageAction.bind(null, icon.id, icon.image_path)}
                        buttonClassName="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <CloseIcon size={12}/>
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

                <div className="md:col-span-3 space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{t('fullArt')}</label>
                  {splash?.publicUrl ? (
                    <div className="relative w-full aspect-video group">
                      <Image
                        src={splash.publicUrl}
                        alt="Splash"
                        fill
                        sizes="(max-width: 768px) 100vw, 75vw"
                        className="object-contain rounded-2xl border-2 border-zinc-800 bg-black shadow-xl"
                      />
                      <ConfirmButton
                        action={deleteImageAction.bind(null, splash.id, splash.image_path)}
                        buttonClassName="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <CloseIcon size={12}/>
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
