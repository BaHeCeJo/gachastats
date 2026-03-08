"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Edit2, X as CloseIcon } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/client";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import ImageInput from "@/app/components/ImageInput";
import ConfirmButton from "@/app/components/ConfirmButton";
import { upsertSkin, upsertSkinImage, deleteSkin, deleteSkinImage } from "./actions";
import LocalizedTextInput from "@/app/components/fields/LocalizedTextInput";

interface SkinImage { id: string; type: string; image_path: string; }
interface Skin { id: string; name: LocalizedString; is_default: boolean; entity_images: SkinImage[]; }
interface Entity { id: string; name: LocalizedString; }

/**
 * Renders a single image slot within a skin.
 */
function SkinImageSlot({
  type, skin, onUpload, onDelete
}: {
  type: string; skin: Skin; onUpload: (skinId: string, type: string, file: File | null) => Promise<void>; onDelete: (id: string, path: string) => Promise<void>;
}) {
  const image = skin.entity_images.find(img => img.type === type);
  const publicUrl = image ? getPublicUrl('games', image.image_path) : null;

  return (
    <div className="space-y-3 p-4 bg-black/40 rounded-2xl border border-white/5 group/image">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{type}</span>
        {image && (
          <button onClick={() => onDelete(image.id, image.image_path)} className="text-zinc-700 hover:text-red-500 transition-colors">
            <CloseIcon size={14} />
          </button>
        )}
      </div>
      
      <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
        {publicUrl ? (
          <Image src={publicUrl} alt={type} fill sizes="150px" className="object-contain p-2" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-800"><CloseIcon size={24} /></div>
        )}
      </div>

      <ImageInput name={`file-${skin.id}-${type}`} onFileChange={(file) => onUpload(skin.id, type, file)} hidePreview />
    </div>
  );
}

export default function SkinManager({
  entity, skins, gameSlug, sectionId, gameDefaultLang, activeLang, skinImageTypes = ["icon", "splashart"]
}: {
  entity: Entity; skins: Skin[]; gameSlug: string; sectionId: string; gameDefaultLang: string; activeLang: string; skinImageTypes?: string[];
}) {
  const { t } = useLocalizationParams();
  const [isAddingSkin, setIsAddingSkin] = useState(false);
  const [editingSkinId, setEditingSkinId] = useState<string | null>(null);
  const [newSkinName, setNewSkinName] = useState<LocalizedString>({ [gameDefaultLang]: "" });

  const handleUpsertSkin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (editingSkinId) formData.set("id", editingSkinId);
    formData.set("name", JSON.stringify(newSkinName));
    
    let isDefault = skins.length === 0;
    if (editingSkinId) {
      const skin = skins.find(s => s.id === editingSkinId);
      if (skin) isDefault = skin.is_default;
    }
    formData.set("is_default", isDefault.toString());

    const res = await upsertSkin(gameSlug, sectionId, entity.id, gameDefaultLang, formData);
    if (!res.error) { setIsAddingSkin(false); setEditingSkinId(null); setNewSkinName({ [gameDefaultLang]: "" }); }
  };

  const handleImageUpload = async (skinId: string, type: string, file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.set("imageType", type);
    formData.set("image_file", file);
    await upsertSkinImage(gameSlug, sectionId, entity.id, skinId, formData);
  };

  const sortedSkins = useMemo(() => [...skins].sort((a, b) => {
    if (a.is_default) return -1;
    if (b.is_default) return 1;
    return 0;
  }), [skins]);

  return (
    <div className="space-y-8 mt-12 pt-12 border-t border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <span className="w-8 h-1 bg-blue-500 rounded-full" />{t('skins')}
        </h2>
        <button onClick={() => setIsAddingSkin(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">{t('addSkin')}</button>
      </div>

      {(isAddingSkin || editingSkinId) && (
        <form onSubmit={handleUpsertSkin} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <LocalizedTextInput id="skin-name" label={t('skinName')} value={newSkinName} onChange={setNewSkinName} />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setIsAddingSkin(false); setEditingSkinId(null); }} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">{t('cancel')}</button>
            <button type="submit" className="px-6 py-2 bg-[#22c55e] text-black font-bold rounded-xl hover:bg-[#1da34a] transition-all">{t('save')}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-6">
        {sortedSkins.map((skin) => (
          <div key={skin.id} className={`p-8 bg-zinc-900/30 border rounded-[2.5rem] transition-all ${skin.is_default ? "border-blue-500/50 shadow-2xl shadow-blue-500/5" : "border-zinc-800"}`}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black italic uppercase tracking-tight text-white">{getTranslatedField(skin.name, activeLang, gameDefaultLang)}</h3>
                {skin.is_default && <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">{t('default')}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingSkinId(skin.id); setNewSkinName(skin.name); }} className="p-2 text-zinc-500 hover:text-white transition-colors"><Edit2 size={18} /></button>
                {!skin.is_default && <form action={deleteSkin.bind(null, skin.id, entity.id, gameSlug, sectionId)}><ConfirmButton buttonClassName="p-2 text-zinc-500 hover:text-red-500 transition-colors">{t('delete')}</ConfirmButton></form>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {skinImageTypes.map(type => (
                <SkinImageSlot key={type} type={type} skin={skin} onUpload={handleImageUpload} onDelete={(id: string, path: string) => deleteSkinImage(id, path, gameSlug, sectionId, entity.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
