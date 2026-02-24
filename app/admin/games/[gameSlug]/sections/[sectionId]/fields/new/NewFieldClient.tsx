"use client";

import { useState, useActionState } from 'react';
import { LocalizedString, GameLocalizationProvider, getTranslatedField } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import { upsertFieldAction } from '../actions';

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type SectionData = { id: string; key: LocalizedString; game_id: string; };
type FormState = { error?: string; };

export default function NewFieldClient({ game, section, categories }: { game: GameData, section: SectionData, categories: string[] }) {
  const [localizedKey, setLocalizedKey] = useState<LocalizedString>({ [game.default_lang]: "" });
  const [category, setCategory] = useState<string>('General');
  const [orderIndex, setOrderIndex] = useState<number>(0);
  const [required, setRequired] = useState<boolean>(false);
  const [manualFill, setManualFill] = useState<boolean>(true);
  const [isMulti, setIsMulti] = useState<boolean>(false);
  const [hasIcon, setHasIcon] = useState<boolean>(false);
  const [hasColor, setHasColor] = useState<boolean>(false);
  const [fieldType, setFieldType] = useState<string>('text');

  const [state, formAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("key", JSON.stringify(localizedKey));
      formData.set("category", category);
      formData.set("order_index", orderIndex.toString());
      formData.set("required", required ? 'on' : 'off');
      formData.set("manual_fill", manualFill ? 'on' : 'off');
      formData.set("is_multi", isMulti ? 'on' : 'off');
      formData.set("has_icon", hasIcon ? 'on' : 'off');
      formData.set("has_color", hasColor ? 'on' : 'off');
      formData.set("field_type", fieldType);
      return await upsertFieldAction(game.slug, section.id, game.default_lang, formData);
    },
    {} as FormState
  );

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-xl p-8 space-y-6 mx-auto">
        <h1 className="text-2xl font-bold text-white">{getTranslatedField(section.key, game.default_lang, game.default_lang)} — Add Field</h1>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <form action={formAction} className="space-y-4">
          <LocalizedTextInput id="key" label="Field Name (Key)" value={localizedKey} onChange={setLocalizedKey} placeholder="e.g., Element" />
          <div className="space-y-1">
            <label htmlFor="category" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Category</label>
            <input id="category" name="category" placeholder="Category" className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" list="category-list" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="category-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
          </div>
          <div className="space-y-1">
            <label htmlFor="field_type" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Field Type</label>
            <select id="field_type" name="field_type" value={fieldType} onChange={(e) => setFieldType(e.target.value)} className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="select">Select</option>
              <option value="multi-select">Multi-Select</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={manualFill} onChange={(e) => setManualFill(e.target.checked)} /> Manual input</label>
            <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={isMulti} onChange={(e) => setIsMulti(e.target.checked)} /> Multiple values</label>
          </div>
          <div className="flex gap-6 items-center">
            <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label>
            <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={hasIcon} onChange={(e) => setHasIcon(e.target.checked)} /> Has icon</label>
            <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={hasColor} onChange={(e) => setHasColor(e.target.checked)} /> Has color</label>
          </div>
          <div>
            <label htmlFor="order_index" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Order Index</label>
            <input id="order_index" name="order_index" type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="block w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" />
          </div>
          <button type="submit" className="w-full bg-green-600 text-black font-bold px-4 py-3 rounded-xl hover:bg-green-500 transition-colors">Create Field</button>
        </form>
      </main>
    </GameLocalizationProvider>
  );
}
