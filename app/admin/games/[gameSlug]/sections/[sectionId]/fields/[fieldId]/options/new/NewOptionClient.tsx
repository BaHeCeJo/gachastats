"use client";

import { useState, useActionState } from 'react';
import { LocalizedString, GameLocalizationProvider, getTranslatedField } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import { upsertOptionAction } from '../actions';

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type FieldData = { id: string; key: LocalizedString; manual_fill: boolean; has_icon: boolean; has_color: boolean; };
type FormState = { error?: string; };

export default function NewOptionClient({ game, field, sectionId, currentLang }: {
  game: GameData;
  field: FieldData;
  sectionId: string;
  currentLang: string;
}) {
  const [localizedValueKey, setLocalizedValueKey] = useState<LocalizedString>({ [game.default_lang]: "" });
  const [color, setColor] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [orderIndex, setOrderIndex] = useState<number>(0);

  const [state, formAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("value_key", JSON.stringify(localizedValueKey));
      formData.set("color", color || "");
      formData.set("order_index", orderIndex.toString());
      if (iconFile) formData.set("icon_file", iconFile); else formData.delete("icon_file");
      return await upsertOptionAction(game.slug, sectionId, field.id, game.default_lang, formData);
    },
    {} as FormState
  );

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-xl p-8 space-y-6 mx-auto">
        <h1 className="text-2xl font-bold text-white">Add Option for &quot;{getTranslatedField(field.key, currentLang, game.default_lang)}&quot;</h1>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <form action={formAction} className="space-y-4">
          <LocalizedTextInput id="value_key" label="Option Value Key" value={localizedValueKey} onChange={setLocalizedValueKey} placeholder="e.g., Fire, Ice" />
          {field.has_color && (
            <div>
              <label htmlFor="color" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Color</label>
              <input id="color" name="color" type="color" value={color || '#ffffff'} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 border-0 rounded-md overflow-hidden bg-zinc-900" />
            </div>
          )}
          {field.has_icon && (
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Icon</label>
              <ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={null} />
            </div>
          )}
          <div>
            <label htmlFor="order_index" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Order Index</label>
            <input id="order_index" name="order_index" type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="block w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" />
          </div>
          <button type="submit" className="w-full bg-green-600 text-black font-bold px-4 py-3 rounded-xl hover:bg-green-500 transition-colors">Create Option</button>
        </form>
      </main>
    </GameLocalizationProvider>
  );
}
